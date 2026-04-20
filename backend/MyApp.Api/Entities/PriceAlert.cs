namespace MyApp.Api.Entities;

public class PriceAlert
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public Guid ProductId { get; set; }
    public decimal TargetPrice { get; set; }
    public string AlertType { get; set; } = "BelowPrice";  // "BelowPrice" | "AnyDrop"
    public bool IsTriggered { get; set; }
    public DateTime? TriggeredAt { get; set; }
    public DateTime CreatedAt { get; set; }

    public User User { get; set; } = null!;
    public Product Product { get; set; } = null!;
}