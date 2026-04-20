namespace MyApp.Api.DTOs;

// ── Store Requests ───────────────────────────────────────────────────────────

public record StoreCreateDto(
    string Name,
    string? ChainName,
    string? Address,
    double? Latitude,
    double? Longitude,
    string? WebsiteUrl
);

public record StoreUpdateDto(
    string Name,
    string? ChainName,
    string? Address,
    double? Latitude,
    double? Longitude,
    string? WebsiteUrl
);

// ── Store Responses ──────────────────────────────────────────────────────────

public record StoreResponseDto(
    Guid Id,
    string Name,
    string? ChainName,
    string? Address,
    double? Latitude,
    double? Longitude,
    string? WebsiteUrl,
    int PriceRecordCount,
    DateTime CreatedAt
);

// ── PriceRecord Requests ─────────────────────────────────────────────────────

public record PriceRecordCreateDto(
    Guid ProductId,
    Guid StoreId,
    decimal Price,
    decimal? OriginalPrice,
    bool IsOnSale,
    string Currency = "USD",
    string Source = "staff"
);

public record PriceRecordQueryDto(
    Guid? ProductId,
    Guid? StoreId,
    DateTime? From,
    DateTime? To,
    bool OnSaleOnly = false,
    int Page = 1,
    int PageSize = 50
);

// ── PriceRecord Responses ────────────────────────────────────────────────────

public record PriceRecordResponseDto(
    Guid Id,
    Guid ProductId,
    string ProductName,
    Guid StoreId,
    string StoreName,
    decimal Price,
    decimal? OriginalPrice,
    bool IsOnSale,
    string Currency,
    string Source,
    DateTime RecordedAt
);

public record PriceHistoryDto(
    Guid ProductId,
    string ProductName,
    IEnumerable<PriceHistoryPointDto> History
);

public record PriceHistoryPointDto(
    Guid StoreId,
    string StoreName,
    decimal Price,
    bool IsOnSale,
    DateTime RecordedAt
);