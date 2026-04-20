namespace MyApp.Api.DTOs;

// ── Requests ────────────────────────────────────────────────────────────────

public record CategoryCreateDto(
    string Name,
    string Slug,
    Guid? ParentId
);

public record CategoryUpdateDto(
    string Name,
    string Slug,
    Guid? ParentId
);

// ── Responses ───────────────────────────────────────────────────────────────

public record CategoryResponseDto(
    Guid Id,
    string Name,
    string Slug,
    Guid? ParentId,
    string? ParentName,
    int ProductCount
);

public record CategoryTreeDto(
    Guid Id,
    string Name,
    string Slug,
    IEnumerable<CategoryTreeDto> Children
);