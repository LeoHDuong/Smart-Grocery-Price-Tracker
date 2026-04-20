using Microsoft.EntityFrameworkCore;
using MyApp.Api.Data;
using MyApp.Api.DTOs;
using MyApp.Api.Entities;
using MyApp.Api.Services.Interfaces;

namespace MyApp.Api.Services;

public class CategoryService(AppDbContext db) : ICategoryService
{
    // ── Query / Read ─────────────────────────────────────────────────────────

    public async Task<IEnumerable<CategoryResponseDto>> GetAllAsync(CancellationToken ct = default)
    {
        var categories = await db.Categories
            .Include(c => c.Parent)
            .Include(c => c.Products)
            .AsNoTracking()
            .OrderBy(c => c.Name)
            .ToListAsync(ct);

        return categories.Select(MapToResponseDto);
    }

    public async Task<IEnumerable<CategoryTreeDto>> GetTreeAsync(CancellationToken ct = default)
    {
        // Load everything in one query, build tree in memory
        var all = await db.Categories
            .AsNoTracking()
            .OrderBy(c => c.Name)
            .ToListAsync(ct);

        var lookup = all.ToLookup(c => c.ParentId);

        // Recursively build tree starting from root nodes (ParentId == null)
        return BuildTree(lookup, parentId: null);
    }

    public async Task<CategoryResponseDto?> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        var category = await db.Categories
            .Include(c => c.Parent)
            .Include(c => c.Products)
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.Id == id, ct);

        return category is null ? null : MapToResponseDto(category);
    }

    // ── Commands ─────────────────────────────────────────────────────────────

    public async Task<CategoryResponseDto> CreateAsync(
        CategoryCreateDto dto, CancellationToken ct = default)
    {
        var slugExists = await db.Categories.AnyAsync(c => c.Slug == dto.Slug, ct);
        if (slugExists)
            throw new InvalidOperationException($"A category with slug '{dto.Slug}' already exists.");

        var category = new Category
        {
            Id       = Guid.NewGuid(),
            Name     = dto.Name,
            Slug     = dto.Slug,
            ParentId = dto.ParentId,
        };

        db.Categories.Add(category);
        await db.SaveChangesAsync(ct);

        return await GetResponseDtoByIdAsync(category.Id, ct)
            ?? throw new InvalidOperationException("Category not found after creation.");
    }

    public async Task<CategoryResponseDto?> UpdateAsync(
        Guid id, CategoryUpdateDto dto, CancellationToken ct = default)
    {
        var category = await db.Categories.FindAsync([id], ct);
        if (category is null) return null;

        // Ensure slug uniqueness (ignore current category)
        var slugTaken = await db.Categories
            .AnyAsync(c => c.Slug == dto.Slug && c.Id != id, ct);
        if (slugTaken)
            throw new InvalidOperationException($"A category with slug '{dto.Slug}' already exists.");

        // Prevent circular parent reference
        if (dto.ParentId.HasValue && await IsDescendantOf(dto.ParentId.Value, id, ct))
            throw new InvalidOperationException("A category cannot be its own ancestor.");

        category.Name     = dto.Name;
        category.Slug     = dto.Slug;
        category.ParentId = dto.ParentId;

        await db.SaveChangesAsync(ct);
        return await GetResponseDtoByIdAsync(id, ct);
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken ct = default)
    {
        var category = await db.Categories
            .Include(c => c.Children)
            .Include(c => c.Products)
            .FirstOrDefaultAsync(c => c.Id == id, ct);

        if (category is null) return false;

        if (category.Children.Any())
            throw new InvalidOperationException("Cannot delete a category that has sub-categories.");

        if (category.Products.Any())
            throw new InvalidOperationException("Cannot delete a category that has products assigned to it.");

        db.Categories.Remove(category);
        await db.SaveChangesAsync(ct);
        return true;
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private async Task<CategoryResponseDto?> GetResponseDtoByIdAsync(Guid id, CancellationToken ct)
    {
        var category = await db.Categories
            .Include(c => c.Parent)
            .Include(c => c.Products)
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.Id == id, ct);

        return category is null ? null : MapToResponseDto(category);
    }

    /// <summary>Checks whether <paramref name="candidateAncestorId"/> is a descendant of
    /// <paramref name="rootId"/>, to prevent circular parent references.</summary>
    private async Task<bool> IsDescendantOf(Guid candidateAncestorId, Guid rootId, CancellationToken ct)
    {
        var current = candidateAncestorId;
        while (true)
        {
            if (current == rootId) return true;

            var parent = await db.Categories
                .Where(c => c.Id == current)
                .Select(c => c.ParentId)
                .FirstOrDefaultAsync(ct);

            if (parent is null) return false;
            current = parent.Value;
        }
    }

    private static IEnumerable<CategoryTreeDto> BuildTree(
        ILookup<Guid?, Category> lookup, Guid? parentId)
    {
        return lookup[parentId].Select(c => new CategoryTreeDto(
            c.Id,
            c.Name,
            c.Slug,
            BuildTree(lookup, c.Id)));
    }

    private static CategoryResponseDto MapToResponseDto(Category c) => new(
        c.Id,
        c.Name,
        c.Slug,
        c.ParentId,
        c.Parent?.Name,
        c.Products.Count);
}