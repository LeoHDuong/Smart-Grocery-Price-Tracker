using Microsoft.EntityFrameworkCore;
using MyApp.Api.Data;
using MyApp.Api.DTOs;
using MyApp.Api.Entities;
using MyApp.Api.Services.Interfaces;

namespace MyApp.Api.Services;

public class PriceAlertService(AppDbContext db) : IPriceAlertService
{
    public async Task<IEnumerable<PriceAlertResponseDto>> GetByUserAsync(
        Guid userId, bool includeTriggered = false, CancellationToken ct = default)
    {
        var query = db.PriceAlerts
            .Where(a => a.UserId == userId)
            .Include(a => a.Product)
                .ThenInclude(p => p.PriceRecords)
                    .ThenInclude(pr => pr.Store)
            .AsNoTracking();

        if (!includeTriggered)
            query = query.Where(a => !a.IsTriggered);

        var alerts = await query
            .OrderByDescending(a => a.CreatedAt)
            .ToListAsync(ct);

        return alerts.Select(MapToDto);
    }

    public async Task<PriceAlertResponseDto?> GetByIdAsync(
        Guid id, Guid userId, CancellationToken ct = default)
    {
        var alert = await LoadAlertAsync(id, userId, ct);
        return alert is null ? null : MapToDto(alert);
    }

    public async Task<PriceAlertResponseDto> CreateAsync(
        Guid userId, PriceAlertCreateDto dto, CancellationToken ct = default)
    {
        // Prevent duplicate active alert for same user + product + type
        var duplicate = await db.PriceAlerts.AnyAsync(
            a => a.UserId == userId &&
                 a.ProductId == dto.ProductId &&
                 a.AlertType == dto.AlertType &&
                 !a.IsTriggered, ct);

        if (duplicate)
            throw new InvalidOperationException(
                "An active alert of this type already exists for this product.");

        var alert = new PriceAlert
        {
            Id          = Guid.NewGuid(),
            UserId      = userId,
            ProductId   = dto.ProductId,
            TargetPrice = dto.TargetPrice,
            AlertType   = dto.AlertType,
            IsTriggered = false,
            CreatedAt   = DateTime.UtcNow,
        };

        db.PriceAlerts.Add(alert);
        await db.SaveChangesAsync(ct);

        var created = await LoadAlertAsync(alert.Id, userId, ct)!;
        return MapToDto(created!);
    }

    public async Task<PriceAlertResponseDto?> UpdateAsync(
        Guid id, Guid userId, PriceAlertUpdateDto dto, CancellationToken ct = default)
    {
        var alert = await db.PriceAlerts
            .FirstOrDefaultAsync(a => a.Id == id && a.UserId == userId, ct);

        if (alert is null) return null;

        alert.TargetPrice = dto.TargetPrice;
        alert.AlertType   = dto.AlertType;
        // Reset triggered state when user adjusts the alert
        alert.IsTriggered = false;
        alert.TriggeredAt = null;

        await db.SaveChangesAsync(ct);

        var updated = await LoadAlertAsync(id, userId, ct);
        return updated is null ? null : MapToDto(updated);
    }

    public async Task<bool> DeleteAsync(Guid id, Guid userId, CancellationToken ct = default)
    {
        var alert = await db.PriceAlerts
            .FirstOrDefaultAsync(a => a.Id == id && a.UserId == userId, ct);

        if (alert is null) return false;

        db.PriceAlerts.Remove(alert);
        await db.SaveChangesAsync(ct);
        return true;
    }

    /// <summary>
    /// Evaluates all untriggered alerts against the latest price per product.
    /// - BelowPrice: triggers when the lowest current price is at or below TargetPrice.
    /// - AnyDrop: triggers when any store's latest price is lower than the previous record.
    /// Call this from a background job after each scraper run completes.
    /// </summary>
    public async Task<int> EvaluateAlertsAsync(CancellationToken ct = default)
    {
        var alerts = await db.PriceAlerts
            .Where(a => !a.IsTriggered)
            .Include(a => a.Product)
                .ThenInclude(p => p.PriceRecords)
            .ToListAsync(ct);

        var triggered = 0;

        foreach (var alert in alerts)
        {
            var records = alert.Product.PriceRecords;
            var latestPerStore = records
                .GroupBy(pr => pr.StoreId)
                .Select(g => g.OrderByDescending(pr => pr.RecordedAt).First())
                .ToList();

            bool shouldTrigger = alert.AlertType switch
            {
                "BelowPrice" => latestPerStore.Any(pr => pr.Price <= alert.TargetPrice),
                "AnyDrop"    => HasAnyPriceDrop(records),
                _            => false
            };

            if (!shouldTrigger) continue;

            alert.IsTriggered = true;
            alert.TriggeredAt = DateTime.UtcNow;
            triggered++;
        }

        if (triggered > 0)
            await db.SaveChangesAsync(ct);

        return triggered;
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private async Task<PriceAlert?> LoadAlertAsync(Guid id, Guid userId, CancellationToken ct) =>
        await db.PriceAlerts
            .Where(a => a.Id == id && a.UserId == userId)
            .Include(a => a.Product)
                .ThenInclude(p => p.PriceRecords)
                    .ThenInclude(pr => pr.Store)
            .AsNoTracking()
            .FirstOrDefaultAsync(ct);

    /// <summary>Returns true if any store has a newer record cheaper than its previous one.</summary>
    private static bool HasAnyPriceDrop(ICollection<PriceRecord> records)
    {
        return records
            .GroupBy(pr => pr.StoreId)
            .Any(g =>
            {
                var ordered = g.OrderByDescending(pr => pr.RecordedAt).Take(2).ToList();
                return ordered.Count == 2 && ordered[0].Price < ordered[1].Price;
            });
    }

    private static PriceAlertResponseDto MapToDto(PriceAlert a)
    {
        var lowestPrice = a.Product.PriceRecords
            .GroupBy(pr => pr.StoreId)
            .Select(g => g.OrderByDescending(pr => pr.RecordedAt).First())
            .OrderBy(pr => pr.Price)
            .FirstOrDefault()?.Price;

        return new PriceAlertResponseDto(
            a.Id,
            a.UserId,
            a.ProductId,
            a.Product.Name,
            a.Product.Brand,
            a.TargetPrice,
            a.AlertType,
            a.IsTriggered,
            a.TriggeredAt,
            lowestPrice,
            a.CreatedAt);
    }
}