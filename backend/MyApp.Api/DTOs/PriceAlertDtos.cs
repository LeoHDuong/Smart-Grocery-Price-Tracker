namespace MyApp.Api.DTOs;

// ── Requests ─────────────────────────────────────────────────────────────────

public record PriceAlertCreateDto(
    Guid ProductId,
    decimal TargetPrice,
    string AlertType = "BelowPrice"   // "BelowPrice" | "AnyDrop"
);

public record PriceAlertUpdateDto(
    decimal TargetPrice,
    string AlertType
);

// ── Responses ────────────────────────────────────────────────────────────────

public record PriceAlertResponseDto(
    Guid Id,
    Guid UserId,
    Guid ProductId,
    string ProductName,
    string? ProductBrand,
    decimal TargetPrice,
    string AlertType,
    bool IsTriggered,
    DateTime? TriggeredAt,
    decimal? CurrentLowestPrice,
    DateTime CreatedAt
);