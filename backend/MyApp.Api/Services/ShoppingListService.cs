using Microsoft.EntityFrameworkCore;
using MyApp.Api.Data;
using MyApp.Api.DTOs;
using MyApp.Api.Entities;
using MyApp.Api.Services.Interfaces;

namespace MyApp.Api.Services;

public class ShoppingListService(AppDbContext db) : IShoppingListService
{
    // ── Lists ─────────────────────────────────────────────────────────────────

    public async Task<IEnumerable<ShoppingListResponseDto>> GetByUserAsync(
        Guid userId, CancellationToken ct = default)
    {
        var lists = await db.ShoppingLists
            .Where(l => l.UserId == userId)
            .Include(l => l.Items)
                .ThenInclude(i => i.Product)
                    .ThenInclude(p => p.PriceRecords)
                        .ThenInclude(pr => pr.Store)
            .AsNoTracking()
            .OrderByDescending(l => l.CreatedAt)
            .ToListAsync(ct);

        return lists.Select(MapToResponseDto);
    }

    public async Task<ShoppingListDetailDto?> GetByIdAsync(
        Guid id, Guid userId, CancellationToken ct = default)
    {
        var list = await LoadListAsync(id, userId, ct);
        return list is null ? null : MapToDetailDto(list);
    }

    public async Task<ShoppingListResponseDto> CreateAsync(
        Guid userId, ShoppingListCreateDto dto, CancellationToken ct = default)
    {
        var list = new ShoppingList
        {
            Id        = Guid.NewGuid(),
            UserId    = userId,
            Name      = dto.Name,
            IsActive  = true,
            CreatedAt = DateTime.UtcNow,
        };

        db.ShoppingLists.Add(list);
        await db.SaveChangesAsync(ct);

        return MapToResponseDto(list);
    }

    public async Task<ShoppingListResponseDto?> UpdateAsync(
        Guid id, Guid userId, ShoppingListUpdateDto dto, CancellationToken ct = default)
    {
        var list = await db.ShoppingLists
            .FirstOrDefaultAsync(l => l.Id == id && l.UserId == userId, ct);

        if (list is null) return null;

        list.Name     = dto.Name;
        list.IsActive = dto.IsActive;

        await db.SaveChangesAsync(ct);

        // Reload with items for accurate counts
        var full = await LoadListAsync(id, userId, ct);
        return full is null ? null : MapToResponseDto(full);
    }

    public async Task<bool> DeleteAsync(Guid id, Guid userId, CancellationToken ct = default)
    {
        var list = await db.ShoppingLists
            .FirstOrDefaultAsync(l => l.Id == id && l.UserId == userId, ct);

        if (list is null) return false;

        db.ShoppingLists.Remove(list);
        await db.SaveChangesAsync(ct);
        return true;
    }

    // ── Items ─────────────────────────────────────────────────────────────────

    public async Task<ShoppingListItemResponseDto> AddItemAsync(
        Guid listId, Guid userId, ShoppingListItemAddDto dto, CancellationToken ct = default)
    {
        var list = await db.ShoppingLists
            .Include(l => l.Items)
            .FirstOrDefaultAsync(l => l.Id == listId && l.UserId == userId, ct)
            ?? throw new InvalidOperationException("Shopping list not found.");

        // Increment quantity if product already in list
        var existing = list.Items.FirstOrDefault(i => i.ProductId == dto.ProductId);
        if (existing is not null)
        {
            existing.Quantity += dto.Quantity;
            if (dto.TargetPrice.HasValue)
                existing.TargetPrice = dto.TargetPrice;

            await db.SaveChangesAsync(ct);
            return await LoadItemDtoAsync(existing.Id, ct);
        }

        var item = new ShoppingListItem
        {
            Id          = Guid.NewGuid(),
            ListId      = listId,
            ProductId   = dto.ProductId,
            Quantity    = dto.Quantity,
            IsChecked   = false,
            TargetPrice = dto.TargetPrice,
        };

        db.ShoppingListItems.Add(item);
        await db.SaveChangesAsync(ct);
        return await LoadItemDtoAsync(item.Id, ct);
    }

    public async Task<ShoppingListItemResponseDto?> UpdateItemAsync(
        Guid listId, Guid itemId, Guid userId, ShoppingListItemUpdateDto dto,
        CancellationToken ct = default)
    {
        // Verify ownership via list
        var ownslist = await db.ShoppingLists
            .AnyAsync(l => l.Id == listId && l.UserId == userId, ct);
        if (!ownslist) return null;

        var item = await db.ShoppingListItems
            .FirstOrDefaultAsync(i => i.Id == itemId && i.ListId == listId, ct);
        if (item is null) return null;

        item.Quantity    = dto.Quantity;
        item.IsChecked   = dto.IsChecked;
        item.TargetPrice = dto.TargetPrice;

        await db.SaveChangesAsync(ct);
        return await LoadItemDtoAsync(itemId, ct);
    }

    public async Task<bool> RemoveItemAsync(
        Guid listId, Guid itemId, Guid userId, CancellationToken ct = default)
    {
        var ownslist = await db.ShoppingLists
            .AnyAsync(l => l.Id == listId && l.UserId == userId, ct);
        if (!ownslist) return false;

        var item = await db.ShoppingListItems
            .FirstOrDefaultAsync(i => i.Id == itemId && i.ListId == listId, ct);
        if (item is null) return false;

        db.ShoppingListItems.Remove(item);
        await db.SaveChangesAsync(ct);
        return true;
    }

    public async Task ResetCheckedAsync(Guid listId, Guid userId, CancellationToken ct = default)
    {
        var items = await db.ShoppingListItems
            .Where(i => i.ListId == listId && i.List.UserId == userId)
            .ToListAsync(ct);

        foreach (var item in items)
            item.IsChecked = false;

        await db.SaveChangesAsync(ct);
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private async Task<ShoppingList?> LoadListAsync(Guid id, Guid userId, CancellationToken ct) =>
        await db.ShoppingLists
            .Where(l => l.Id == id && l.UserId == userId)
            .Include(l => l.Items)
                .ThenInclude(i => i.Product)
                    .ThenInclude(p => p.PriceRecords)
                        .ThenInclude(pr => pr.Store)
            .AsNoTracking()
            .FirstOrDefaultAsync(ct);

    private async Task<ShoppingListItemResponseDto> LoadItemDtoAsync(Guid itemId, CancellationToken ct)
    {
        var item = await db.ShoppingListItems
            .Include(i => i.Product)
                .ThenInclude(p => p.PriceRecords)
                    .ThenInclude(pr => pr.Store)
            .AsNoTracking()
            .FirstOrDefaultAsync(i => i.Id == itemId, ct)
            ?? throw new InvalidOperationException("Item not found after save.");

        return MapToItemDto(item);
    }

    private static ShoppingListResponseDto MapToResponseDto(ShoppingList l)
    {
        var estimated = l.Items.Any()
            ? l.Items.Sum(i => GetLowestPrice(i.Product) * i.Quantity)
            : (decimal?)null;

        return new ShoppingListResponseDto(
            l.Id,
            l.UserId,
            l.Name,
            l.IsActive,
            l.Items.Count,
            l.Items.Count(i => i.IsChecked),
            estimated,
            l.CreatedAt);
    }

    private static ShoppingListDetailDto MapToDetailDto(ShoppingList l)
    {
        var items = l.Items.Select(MapToItemDto);
        var estimated = l.Items.Any()
            ? l.Items.Sum(i => GetLowestPrice(i.Product) * i.Quantity)
            : (decimal?)null;

        return new ShoppingListDetailDto(l.Id, l.UserId, l.Name, l.IsActive, items, estimated, l.CreatedAt);
    }

    private static ShoppingListItemResponseDto MapToItemDto(ShoppingListItem i)
    {
        var cheapest = GetCheapestRecord(i.Product);
        var lowestPrice = cheapest?.Price;
        var isBelowTarget = i.TargetPrice.HasValue && lowestPrice.HasValue
            && lowestPrice.Value <= i.TargetPrice.Value;

        return new ShoppingListItemResponseDto(
            i.Id,
            i.ProductId,
            i.Product.Name,
            i.Product.Brand,
            i.Product.ImageUrl,
            i.Quantity,
            i.IsChecked,
            i.TargetPrice,
            lowestPrice,
            cheapest?.Store.Name,
            isBelowTarget);
    }

    /// <summary>Returns the cheapest current (most recent per store) price record for a product.</summary>
    private static PriceRecord? GetCheapestRecord(Product p) =>
        p.PriceRecords
            .GroupBy(pr => pr.StoreId)
            .Select(g => g.OrderByDescending(pr => pr.RecordedAt).First())
            .OrderBy(pr => pr.Price)
            .FirstOrDefault();

    private static decimal? GetLowestPrice(Product p) => GetCheapestRecord(p)?.Price;
}