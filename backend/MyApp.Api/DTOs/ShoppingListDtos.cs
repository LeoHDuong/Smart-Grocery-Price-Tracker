namespace MyApp.Api.DTOs;

// ── Shopping List Requests ───────────────────────────────────────────────────

public record ShoppingListCreateDto(string Name);

public record ShoppingListUpdateDto(string Name, bool IsActive);

public record ShoppingListItemAddDto(
    Guid ProductId,
    int Quantity = 1,
    decimal? TargetPrice = null
);

public record ShoppingListItemUpdateDto(
    int Quantity,
    bool IsChecked,
    decimal? TargetPrice
);

// ── Shopping List Responses ──────────────────────────────────────────────────

public record ShoppingListResponseDto(
    Guid Id,
    Guid UserId,
    string Name,
    bool IsActive,
    int ItemCount,
    int CheckedCount,
    decimal? EstimatedTotal,   // sum of lowest current prices for all items
    DateTime CreatedAt
);

public record ShoppingListDetailDto(
    Guid Id,
    Guid UserId,
    string Name,
    bool IsActive,
    IEnumerable<ShoppingListItemResponseDto> Items,
    decimal? EstimatedTotal,
    DateTime CreatedAt
);

public record ShoppingListItemResponseDto(
    Guid Id,
    Guid ProductId,
    string ProductName,
    string? ProductBrand,
    string? ProductImageUrl,
    int Quantity,
    bool IsChecked,
    decimal? TargetPrice,
    decimal? CurrentLowestPrice,
    string? CheapestStoreName,
    bool IsBelowTarget          // true when CurrentLowestPrice <= TargetPrice
);