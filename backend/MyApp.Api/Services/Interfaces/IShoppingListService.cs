using MyApp.Api.DTOs;

namespace MyApp.Api.Services.Interfaces;

public interface IShoppingListService
{
    /// <summary>Returns all shopping lists for a user.</summary>
    Task<IEnumerable<ShoppingListResponseDto>> GetByUserAsync(Guid userId, CancellationToken ct = default);

    /// <summary>Returns a single list with full item detail. Returns null if not found or not owned by user.</summary>
    Task<ShoppingListDetailDto?> GetByIdAsync(Guid id, Guid userId, CancellationToken ct = default);

    /// <summary>Creates a new shopping list for a user.</summary>
    Task<ShoppingListResponseDto> CreateAsync(Guid userId, ShoppingListCreateDto dto, CancellationToken ct = default);

    /// <summary>Updates list name / active state.</summary>
    Task<ShoppingListResponseDto?> UpdateAsync(Guid id, Guid userId, ShoppingListUpdateDto dto, CancellationToken ct = default);

    /// <summary>Deletes a list. Returns false if not found or not owned by user.</summary>
    Task<bool> DeleteAsync(Guid id, Guid userId, CancellationToken ct = default);

    // ── Items ────────────────────────────────────────────────────────────────

    /// <summary>Adds a product to a list. Increments quantity if already present.</summary>
    Task<ShoppingListItemResponseDto> AddItemAsync(Guid listId, Guid userId, ShoppingListItemAddDto dto, CancellationToken ct = default);

    /// <summary>Updates quantity, checked state or target price for an item.</summary>
    Task<ShoppingListItemResponseDto?> UpdateItemAsync(Guid listId, Guid itemId, Guid userId, ShoppingListItemUpdateDto dto, CancellationToken ct = default);

    /// <summary>Removes an item from a list.</summary>
    Task<bool> RemoveItemAsync(Guid listId, Guid itemId, Guid userId, CancellationToken ct = default);

    /// <summary>Marks all items in a list as unchecked.</summary>
    Task ResetCheckedAsync(Guid listId, Guid userId, CancellationToken ct = default);
}