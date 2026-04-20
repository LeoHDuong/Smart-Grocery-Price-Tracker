namespace MyApp.Api.Entities;

public class Product
{
    public Guid Id { get; set; }
    public string Name { get; set; } = null!;
    public string? Brand { get; set; }
    public string? Unit { get; set; }       // "g" | "ml" | "each" etc.
    public decimal UnitSize { get; set; }   // e.g. 500 (for 500g)
    public Guid? CategoryId { get; set; }
    public string? ImageUrl { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public Category? Category { get; set; }
    public ICollection<PriceRecord> PriceRecords { get; set; } = [];
    public ICollection<ShoppingListItem> ShoppingListItems { get; set; } = [];
    public ICollection<PriceAlert> PriceAlerts { get; set; } = [];
}