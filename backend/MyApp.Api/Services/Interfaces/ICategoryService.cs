using MyApp.Api.DTOs;

namespace MyApp.Api.Services.Interfaces;

public interface ICategoryService
{
    /// <summary>Returns all categories as a flat list.</summary>
    Task<IEnumerable<CategoryResponseDto>> GetAllAsync(CancellationToken ct = default);

    /// <summary>Returns root categories with nested children as a tree structure.</summary>
    Task<IEnumerable<CategoryTreeDto>> GetTreeAsync(CancellationToken ct = default);

    /// <summary>Returns a single category by ID.</summary>
    Task<CategoryResponseDto?> GetByIdAsync(Guid id, CancellationToken ct = default);

    /// <summary>Creates a new category. Throws if slug already exists.</summary>
    Task<CategoryResponseDto> CreateAsync(CategoryCreateDto dto, CancellationToken ct = default);

    /// <summary>Updates an existing category. Returns null if not found.</summary>
    Task<CategoryResponseDto?> UpdateAsync(Guid id, CategoryUpdateDto dto, CancellationToken ct = default);

    /// <summary>Deletes a category. Returns false if not found or if it has products/children.</summary>
    Task<bool> DeleteAsync(Guid id, CancellationToken ct = default);
}