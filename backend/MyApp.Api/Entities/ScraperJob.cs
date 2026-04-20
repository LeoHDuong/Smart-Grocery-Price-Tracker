namespace MyApp.Api.Entities;

public class ScraperJob
{
    public Guid Id { get; set; }
    public Guid StoreId { get; set; }
    public string Status { get; set; } = null!;  // "Pending" | "Running" | "Completed" | "Failed"
    public int ProductsScraped { get; set; }
    public string? ErrorMessage { get; set; }
    public DateTime StartedAt { get; set; }
    public DateTime? FinishedAt { get; set; }

    public Store Store { get; set; } = null!;
}