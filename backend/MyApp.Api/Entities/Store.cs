namespace MyApp.Api.Entities;

public class Store
{
    public Guid Id { get; set; }
    public string Name { get; set; } = null!;
    public string? ChainName { get; set; }   // e.g. "Kroger" for a specific branch
    public string? Address { get; set; }
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }
    public string? WebsiteUrl { get; set; }
    public DateTime CreatedAt { get; set; }

    public ICollection<PriceRecord> PriceRecords { get; set; } = [];
    public ICollection<ScraperJob> ScraperJobs { get; set; } = [];
}