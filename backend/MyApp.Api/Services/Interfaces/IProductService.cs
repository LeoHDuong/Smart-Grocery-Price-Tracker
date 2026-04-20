using MyApp.Api.DTOs;

namespace MyApp.Api.Services.Interfaces;

public interface IProductService
{
    /// <summary>Returns a paged, optionally filtered and sorted list of products.</summary>
    Task<PagedResult<ProductResponseDto>> GetAllAsync(ProductQueryDto query, CancellationToken ct = default);

    /// <summary>Returns a single product with full per-store price breakdown.</summary>
    Task<ProductDetailDto?> GetByIdAsync(Guid id, CancellationToken ct = default);

    /// <summary>Creates a new product and returns it.</summary>
    Task<ProductResponseDto> CreateAsync(ProductCreateDto dto, CancellationToken ct = default);

    /// <summary>Updates an existing product. Returns null if not found.</summary>
    Task<ProductResponseDto?> UpdateAsync(Guid id, ProductUpdateDto dto, CancellationToken ct = default);

    /// <summary>Deletes a product. Returns false if not found.</summary>
    Task<bool> DeleteAsync(Guid id, CancellationToken ct = default);

    /// <summary>Returns the cheapest store price for each product in a given list of product IDs.</summary>
    Task<IEnumerable<StorePriceDto>> GetLowestPricesAsync(IEnumerable<Guid> productIds, CancellationToken ct = default);
}