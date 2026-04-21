using Microsoft.EntityFrameworkCore;
using MyApp.Api.Data;
using MyApp.Api.DTOs;
using MyApp.Api.Entities;
using MyApp.Api.Services.Interfaces;

namespace MyApp.Api.Services;

public class ProductService(AppDbContext db) : IProductService
{
    // ── Query / Read ─────────────────────────────────────────────────────────

    public async Task<PagedResult<ProductResponseDto>> GetAllAsync(
        ProductQueryDto query, CancellationToken ct = default)
    {
        var q = db.Products
            .Include(p => p.Category)
            .Include(p => p.PriceRecords)
                .ThenInclude(pr => pr.Store)
            .AsNoTracking()
            .AsQueryable();

        // Search by name or brand
        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var term = query.Search.ToLower();
            q = q.Where(p =>
                p.Name.ToLower().Contains(term) ||
                (p.Brand != null && p.Brand.ToLower().Contains(term)));
        }

        // Filter by category (includes products in child categories)
        if (query.CategoryId.HasValue)
            q = q.Where(p => p.CategoryId == query.CategoryId.Value);

        // Price sort: computed in-memory as price-per-unit (lowestPrice / unitSize)
        if (query.SortBy?.ToLower() == "price")
        {
            var all = await q.ToListAsync(ct);

            static decimal PricePerUnit(Product p)
            {
                var price = p.PriceRecords
                    .GroupBy(pr => pr.StoreId)
                    .Select(g => g.OrderByDescending(pr => pr.RecordedAt).First())
                    .OrderBy(pr => pr.Price)
                    .FirstOrDefault()?.Price;

                if (price == null) return decimal.MaxValue; // no price → sort last
                return p.UnitSize > 0 ? price.Value / p.UnitSize : price.Value;
            }

            var sorted = query.Descending
                ? all.OrderByDescending(PricePerUnit)
                : all.OrderBy(PricePerUnit);

            var items = sorted
                .Skip((query.Page - 1) * query.PageSize)
                .Take(query.PageSize)
                .Select(MapToResponseDto)
                .ToList();

            return new PagedResult<ProductResponseDto>(items, all.Count, query.Page, query.PageSize);
        }

        // DB-level sort for name / createdAt
        q = (query.SortBy?.ToLower(), query.Descending) switch
        {
            ("name",      false) => q.OrderBy(p => p.Name),
            ("name",      true)  => q.OrderByDescending(p => p.Name),
            ("createdat", false) => q.OrderBy(p => p.CreatedAt),
            ("createdat", true)  => q.OrderByDescending(p => p.CreatedAt),
            _                    => q.OrderBy(p => p.Name) // default
        };

        var totalCount = await q.CountAsync(ct);

        var products = await q
            .Skip((query.Page - 1) * query.PageSize)
            .Take(query.PageSize)
            .ToListAsync(ct);

        var items2 = products.Select(MapToResponseDto);

        return new PagedResult<ProductResponseDto>(items2, totalCount, query.Page, query.PageSize);
    }

    public async Task<ProductDetailDto?> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        var product = await db.Products
            .Include(p => p.Category)
            .Include(p => p.PriceRecords)
                .ThenInclude(pr => pr.Store)
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.Id == id, ct);

        if (product is null) return null;

        // Only keep the most recent price record per store
        var latestPrices = product.PriceRecords
            .GroupBy(pr => pr.StoreId)
            .Select(g => g.OrderByDescending(pr => pr.RecordedAt).First())
            .Select(pr => new StorePriceDto(
                pr.StoreId,
                pr.Store.Name,
                pr.Store.ChainName,
                pr.Price,
                pr.OriginalPrice,
                pr.IsOnSale,
                pr.Currency,
                pr.RecordedAt))
            .OrderBy(sp => sp.Price);

        return new ProductDetailDto(
            product.Id,
            product.Name,
            product.Brand,
            product.Unit,
            product.UnitSize,
            product.CategoryId,
            product.Category?.Name,
            product.ImageUrl,
            latestPrices,
            product.CreatedAt,
            product.UpdatedAt);
    }

    public async Task<IEnumerable<StorePriceDto>> GetLowestPricesAsync(
        IEnumerable<Guid> productIds, CancellationToken ct = default)
    {
        var ids = productIds.ToList();

        var records = await db.PriceRecords
            .Where(pr => ids.Contains(pr.ProductId))
            .Include(pr => pr.Store)
            .AsNoTracking()
            .ToListAsync(ct);

        // Per product: most recent record per store → pick cheapest
        return records
            .GroupBy(pr => pr.ProductId)
            .Select(g =>
                g.GroupBy(pr => pr.StoreId)
                 .Select(sg => sg.OrderByDescending(pr => pr.RecordedAt).First())
                 .OrderBy(pr => pr.Price)
                 .First())
            .Select(pr => new StorePriceDto(
                pr.StoreId,
                pr.Store.Name,
                pr.Store.ChainName,
                pr.Price,
                pr.OriginalPrice,
                pr.IsOnSale,
                pr.Currency,
                pr.RecordedAt));
    }

    // ── Commands ─────────────────────────────────────────────────────────────

    public async Task<ProductResponseDto> CreateAsync(
        ProductCreateDto dto, CancellationToken ct = default)
    {
        var product = new Product
        {
            Id         = Guid.NewGuid(),
            Name       = dto.Name,
            Brand      = dto.Brand,
            Unit       = dto.Unit,
            UnitSize   = dto.UnitSize,
            CategoryId = dto.CategoryId,
            ImageUrl   = dto.ImageUrl,
            CreatedAt  = DateTime.UtcNow,
            UpdatedAt  = DateTime.UtcNow,
        };

        db.Products.Add(product);
        await db.SaveChangesAsync(ct);

        // Reload with navigation props for the response
        return await GetResponseDtoByIdAsync(product.Id, ct)
            ?? throw new InvalidOperationException("Product not found after creation.");
    }

    public async Task<ProductResponseDto?> UpdateAsync(
        Guid id, ProductUpdateDto dto, CancellationToken ct = default)
    {
        var product = await db.Products.FindAsync([id], ct);
        if (product is null) return null;

        product.Name       = dto.Name;
        product.Brand      = dto.Brand;
        product.Unit       = dto.Unit;
        product.UnitSize   = dto.UnitSize;
        product.CategoryId = dto.CategoryId;
        product.ImageUrl   = dto.ImageUrl;
        // UpdatedAt is handled automatically by AppDbContext.UpdateTimestamps()

        await db.SaveChangesAsync(ct);

        return await GetResponseDtoByIdAsync(id, ct);
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken ct = default)
    {
        var product = await db.Products.FindAsync([id], ct);
        if (product is null) return false;

        db.Products.Remove(product);
        await db.SaveChangesAsync(ct);
        return true;
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private async Task<ProductResponseDto?> GetResponseDtoByIdAsync(Guid id, CancellationToken ct)
    {
        var product = await db.Products
            .Include(p => p.Category)
            .Include(p => p.PriceRecords)
                .ThenInclude(pr => pr.Store)
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.Id == id, ct);

        return product is null ? null : MapToResponseDto(product);
    }

    private static ProductResponseDto MapToResponseDto(Product p)
    {
        // Latest price record per store → cheapest
        var cheapest = p.PriceRecords
            .GroupBy(pr => pr.StoreId)
            .Select(g => g.OrderByDescending(pr => pr.RecordedAt).First())
            .OrderBy(pr => pr.Price)
            .FirstOrDefault();

        return new ProductResponseDto(
            p.Id,
            p.Name,
            p.Brand,
            p.Unit,
            p.UnitSize,
            p.CategoryId,
            p.Category?.Name,
            p.ImageUrl,
            cheapest?.Price,
            cheapest?.Store.Name,
            p.CreatedAt,
            p.UpdatedAt);
    }
}