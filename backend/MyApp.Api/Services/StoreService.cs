using Microsoft.EntityFrameworkCore;
using MyApp.Api.Data;
using MyApp.Api.DTOs;
using MyApp.Api.Entities;
using MyApp.Api.Services.Interfaces;

namespace MyApp.Api.Services;

// ── StoreService ──────────────────────────────────────────────────────────────

public class StoreService(AppDbContext db) : IStoreService
{
    public async Task<IEnumerable<StoreResponseDto>> GetAllAsync(CancellationToken ct = default)
    {
        var stores = await db.Stores
            .Include(s => s.PriceRecords)
            .AsNoTracking()
            .OrderBy(s => s.Name)
            .ToListAsync(ct);

        return stores.Select(MapToDto);
    }

    public async Task<StoreResponseDto?> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        var store = await db.Stores
            .Include(s => s.PriceRecords)
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.Id == id, ct);

        return store is null ? null : MapToDto(store);
    }

    public async Task<StoreResponseDto> CreateAsync(StoreCreateDto dto, CancellationToken ct = default)
    {
        var store = new Store
        {
            Id         = Guid.NewGuid(),
            Name       = dto.Name,
            ChainName  = dto.ChainName,
            Address    = dto.Address,
            Latitude   = dto.Latitude,
            Longitude  = dto.Longitude,
            WebsiteUrl = dto.WebsiteUrl,
            CreatedAt  = DateTime.UtcNow,
        };

        db.Stores.Add(store);
        await db.SaveChangesAsync(ct);
        return MapToDto(store);
    }

    public async Task<StoreResponseDto?> UpdateAsync(Guid id, StoreUpdateDto dto, CancellationToken ct = default)
    {
        var store = await db.Stores.FindAsync([id], ct);
        if (store is null) return null;

        store.Name       = dto.Name;
        store.ChainName  = dto.ChainName;
        store.Address    = dto.Address;
        store.Latitude   = dto.Latitude;
        store.Longitude  = dto.Longitude;
        store.WebsiteUrl = dto.WebsiteUrl;

        await db.SaveChangesAsync(ct);
        return await GetByIdAsync(id, ct);
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken ct = default)
    {
        var store = await db.Stores.FindAsync([id], ct);
        if (store is null) return false;

        db.Stores.Remove(store);
        await db.SaveChangesAsync(ct);
        return true;
    }

    private static StoreResponseDto MapToDto(Store s) => new(
        s.Id, s.Name, s.ChainName, s.Address,
        s.Latitude, s.Longitude, s.WebsiteUrl,
        s.PriceRecords.Count, s.CreatedAt);
}

// ── PriceRecordService ────────────────────────────────────────────────────────

public class PriceRecordService(AppDbContext db) : IPriceRecordService
{
    public async Task<PagedResult<PriceRecordResponseDto>> GetAllAsync(
        PriceRecordQueryDto query, CancellationToken ct = default)
    {
        var q = db.PriceRecords
            .Include(pr => pr.Product)
            .Include(pr => pr.Store)
            .AsNoTracking()
            .AsQueryable();

        if (query.ProductId.HasValue) q = q.Where(pr => pr.ProductId == query.ProductId.Value);
        if (query.StoreId.HasValue)   q = q.Where(pr => pr.StoreId == query.StoreId.Value);
        if (query.From.HasValue)      q = q.Where(pr => pr.RecordedAt >= query.From.Value);
        if (query.To.HasValue)        q = q.Where(pr => pr.RecordedAt <= query.To.Value);
        if (query.OnSaleOnly)         q = q.Where(pr => pr.IsOnSale);

        q = q.OrderByDescending(pr => pr.RecordedAt);

        var total = await q.CountAsync(ct);
        var records = await q
            .Skip((query.Page - 1) * query.PageSize)
            .Take(query.PageSize)
            .ToListAsync(ct);

        return new PagedResult<PriceRecordResponseDto>(
            records.Select(MapToDto), total, query.Page, query.PageSize);
    }

    public async Task<PriceHistoryDto?> GetHistoryAsync(Guid productId, CancellationToken ct = default)
    {
        var product = await db.Products
            .Include(p => p.PriceRecords)
                .ThenInclude(pr => pr.Store)
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.Id == productId, ct);

        if (product is null) return null;

        var history = product.PriceRecords
            .OrderBy(pr => pr.RecordedAt)
            .Select(pr => new PriceHistoryPointDto(
                pr.StoreId,
                pr.Store.Name,
                pr.Price,
                pr.IsOnSale,
                pr.RecordedAt));

        return new PriceHistoryDto(product.Id, product.Name, history);
    }

    public async Task<PriceRecordResponseDto> RecordPriceAsync(
        PriceRecordCreateDto dto, CancellationToken ct = default)
    {
        var record = BuildRecord(dto);
        db.PriceRecords.Add(record);
        await db.SaveChangesAsync(ct);
        return await LoadDtoAsync(record.Id, ct);
    }

    public async Task<int> RecordPricesBulkAsync(
        IEnumerable<PriceRecordCreateDto> dtos, CancellationToken ct = default)
    {
        var records = dtos.Select(BuildRecord).ToList();
        await db.PriceRecords.AddRangeAsync(records, ct);
        await db.SaveChangesAsync(ct);
        return records.Count;
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private static PriceRecord BuildRecord(PriceRecordCreateDto dto) => new()
    {
        Id            = Guid.NewGuid(),
        ProductId     = dto.ProductId,
        StoreId       = dto.StoreId,
        Price         = dto.Price,
        OriginalPrice = dto.OriginalPrice,
        IsOnSale      = dto.IsOnSale,
        Currency      = dto.Currency,
        Source        = dto.Source,
        RecordedAt    = DateTime.UtcNow,
    };

    private async Task<PriceRecordResponseDto> LoadDtoAsync(Guid id, CancellationToken ct)
    {
        var record = await db.PriceRecords
            .Include(pr => pr.Product)
            .Include(pr => pr.Store)
            .AsNoTracking()
            .FirstOrDefaultAsync(pr => pr.Id == id, ct)
            ?? throw new InvalidOperationException("Price record not found after save.");

        return MapToDto(record);
    }

    private static PriceRecordResponseDto MapToDto(PriceRecord pr) => new(
        pr.Id, pr.ProductId, pr.Product.Name,
        pr.StoreId, pr.Store.Name,
        pr.Price, pr.OriginalPrice, pr.IsOnSale,
        pr.Currency, pr.Source, pr.RecordedAt);
}