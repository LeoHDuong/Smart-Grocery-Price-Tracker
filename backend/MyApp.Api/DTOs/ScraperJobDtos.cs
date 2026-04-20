namespace MyApp.Api.DTOs;

// ── Requests ─────────────────────────────────────────────────────────────────

public record ScraperJobCreateDto(Guid StoreId);

public record ScraperJobUpdateDto(
    string Status,
    int ProductsScraped,
    string? ErrorMessage,
    DateTime? FinishedAt
);

// ── Responses ────────────────────────────────────────────────────────────────

public record ScraperJobResponseDto(
    Guid Id,
    Guid StoreId,
    string StoreName,
    string Status,
    int ProductsScraped,
    string? ErrorMessage,
    DateTime StartedAt,
    DateTime? FinishedAt,
    TimeSpan? Duration     // FinishedAt - StartedAt
);