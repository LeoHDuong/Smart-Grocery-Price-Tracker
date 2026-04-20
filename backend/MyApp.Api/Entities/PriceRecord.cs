namespace MyApp.Api.Entities;

public class PriceRecord
{
    public Guid Id { get; set; }
    public Guid ProductId { get; set; }
    public Guid StoreId { get; set; }
    public decimal Price { get; set; }
    public decimal? OriginalPrice { get; set; }  // non-null when item is on sale
    public bool IsOnSale { get; set; }
    public string Currency { get; set; } = "USD";
    public string Source { get; set; } = null!;  // "scraper" | "staff"
    public DateTime RecordedAt { get; set; }

    public Product Product { get; set; } = null!;
    public Store Store { get; set; } = null!;
}