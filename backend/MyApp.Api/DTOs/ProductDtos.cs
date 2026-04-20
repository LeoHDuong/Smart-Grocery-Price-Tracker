namespace MyApp.Api.DTOs;

// ── Requests ────────────────────────────────────────────────────────────────

public record ProductCreateDto(
    string Name,
    string? Brand,
    string? Unit,
    decimal UnitSize,
    Guid? CategoryId,
    string? ImageUrl
);

public record ProductUpdateDto(
    string Name,
    string? Brand,
    string? Unit,
    decimal UnitSize,
    Guid? CategoryId,
    string? ImageUrl
);

public record ProductQueryDto(
    string? Search,          // name / brand search
    Guid? CategoryId,
    string? SortBy,          // "name" | "price" | "createdAt"
    bool Descending = false,
    int Page = 1,
    int PageSize = 20
);

// ── Responses ───────────────────────────────────────────────────────────────

public record ProductResponseDto(
    Guid Id,
    string Name,
    string? Brand,
    string? Unit,
    decimal UnitSize,
    Guid? CategoryId,
    string? CategoryName,
    string? ImageUrl,
    decimal? LowestPrice,     // cheapest current price across all stores
    string? LowestPriceStore, // store name for that price
    DateTime CreatedAt,
    DateTime UpdatedAt
);

public record ProductDetailDto(
    Guid Id,
    string Name,
    string? Brand,
    string? Unit,
    decimal UnitSize,
    Guid? CategoryId,
    string? CategoryName,
    string? ImageUrl,
    IEnumerable<StorePriceDto> Prices,
    DateTime CreatedAt,
    DateTime UpdatedAt
);

public record StorePriceDto(
    Guid StoreId,
    string StoreName,
    string? ChainName,
    decimal Price,
    decimal? OriginalPrice,
    bool IsOnSale,
    string Currency,
    DateTime RecordedAt
);

public record PagedResult<T>(
    IEnumerable<T> Items,
    int TotalCount,
    int Page,
    int PageSize
)
{
    public int TotalPages => (int)Math.Ceiling((double)TotalCount / PageSize);
    public bool HasNextPage => Page < TotalPages;
    public bool HasPreviousPage => Page > 1;
}