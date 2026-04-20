namespace MyApp.Api.Entities;

public class User
{
    public Guid Id { get; set; }
    public string Email { get; set; } = null!;
    public string PasswordHash { get; set; } = null!;
    public string FullName { get; set; } = null!;
    public string Role { get; set; } = null!; // "User" | "Staff"
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public ICollection<ShoppingList> ShoppingLists { get; set; } = [];
    public ICollection<PriceAlert> PriceAlerts { get; set; } = [];
}