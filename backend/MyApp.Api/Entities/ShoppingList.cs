namespace MyApp.Api.Entities;

public class ShoppingList
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string Name { get; set; } = null!;
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; }

    public User User { get; set; } = null!;
    public ICollection<ShoppingListItem> Items { get; set; } = [];
}

public class ShoppingListItem
{
    public Guid Id { get; set; }
    public Guid ListId { get; set; }
    public Guid ProductId { get; set; }
    public int Quantity { get; set; } = 1;
    public bool IsChecked { get; set; }
    public decimal? TargetPrice { get; set; }  // optional personal price ceiling

    public ShoppingList List { get; set; } = null!;
    public Product Product { get; set; } = null!;
}