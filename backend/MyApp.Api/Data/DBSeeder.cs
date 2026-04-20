using Microsoft.EntityFrameworkCore;
using MyApp.Api.Entities;

namespace MyApp.Api.Data;

public static class DbSeeder
{
    public static async Task SeedAsync(AppDbContext db)
    {
        await SeedCategoriesAsync(db);
        await SeedStoresAsync(db);
        await SeedProductsAsync(db);
    }

    private static async Task SeedCategoriesAsync(AppDbContext db)
    {
        if (await db.Categories.AnyAsync()) return;

        var categories = new List<Category>
        {
            new() { Id = Guid.NewGuid(), Name = "Dairy",    Slug = "dairy" },
            new() { Id = Guid.NewGuid(), Name = "Meat",     Slug = "meat" },
            new() { Id = Guid.NewGuid(), Name = "Produce",  Slug = "produce" },
            new() { Id = Guid.NewGuid(), Name = "Pantry",   Slug = "pantry" },
            new() { Id = Guid.NewGuid(), Name = "Beverages",Slug = "beverages" },
            new() { Id = Guid.NewGuid(), Name = "Frozen",   Slug = "frozen" },
        };

        await db.Categories.AddRangeAsync(categories);
        await db.SaveChangesAsync();

        // Sub-categories
        var dairy = await db.Categories.FirstAsync(c => c.Slug == "dairy");
        var meat  = await db.Categories.FirstAsync(c => c.Slug == "meat");

        var subs = new List<Category>
        {
            new() { Id = Guid.NewGuid(), Name = "Milk",    Slug = "milk",    ParentId = dairy.Id },
            new() { Id = Guid.NewGuid(), Name = "Cheese",  Slug = "cheese",  ParentId = dairy.Id },
            new() { Id = Guid.NewGuid(), Name = "Yogurt",  Slug = "yogurt",  ParentId = dairy.Id },
            new() { Id = Guid.NewGuid(), Name = "Chicken", Slug = "chicken", ParentId = meat.Id  },
            new() { Id = Guid.NewGuid(), Name = "Beef",    Slug = "beef",    ParentId = meat.Id  },
        };

        await db.Categories.AddRangeAsync(subs);
        await db.SaveChangesAsync();
    }

    private static async Task SeedStoresAsync(AppDbContext db)
    {
        if (await db.Stores.AnyAsync()) return;

        var stores = new List<Store>
        {
            new() { Id = Guid.NewGuid(), Name = "Kroger - Main St",  ChainName = "Kroger",  WebsiteUrl = "https://www.kroger.com",  CreatedAt = DateTime.UtcNow },
            new() { Id = Guid.NewGuid(), Name = "Walmart Supercenter",ChainName = "Walmart", WebsiteUrl = "https://www.walmart.com", CreatedAt = DateTime.UtcNow },
            new() { Id = Guid.NewGuid(), Name = "Target - Downtown",  ChainName = "Target",  WebsiteUrl = "https://www.target.com",  CreatedAt = DateTime.UtcNow },
        };

        await db.Stores.AddRangeAsync(stores);
        await db.SaveChangesAsync();
    }

    private static async Task SeedProductsAsync(AppDbContext db)
    {
        if (await db.Products.AnyAsync()) return;

        var milkCat    = await db.Categories.FirstOrDefaultAsync(c => c.Slug == "milk");
        var chickenCat = await db.Categories.FirstOrDefaultAsync(c => c.Slug == "chicken");
        var pantryCat  = await db.Categories.FirstOrDefaultAsync(c => c.Slug == "pantry");
        var yogurtCat  = await db.Categories.FirstOrDefaultAsync(c => c.Slug == "yogurt");

        var products = new List<Product>
        {
            new() { Id = Guid.NewGuid(), Name = "Whole Milk",       Brand = "Organic Valley", Unit = "ml", UnitSize = 1000, CategoryId = milkCat?.Id,    CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
            new() { Id = Guid.NewGuid(), Name = "Chicken Breast",   Brand = null,             Unit = "g",  UnitSize = 1000, CategoryId = chickenCat?.Id, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
            new() { Id = Guid.NewGuid(), Name = "Penne Pasta",      Brand = "Barilla",        Unit = "g",  UnitSize = 500,  CategoryId = pantryCat?.Id,  CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
            new() { Id = Guid.NewGuid(), Name = "Extra Virgin Olive Oil", Brand = "Kirkland", Unit = "ml", UnitSize = 500,  CategoryId = pantryCat?.Id,  CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
            new() { Id = Guid.NewGuid(), Name = "Brown Rice",       Brand = "Lundberg",       Unit = "g",  UnitSize = 1000, CategoryId = pantryCat?.Id,  CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
            new() { Id = Guid.NewGuid(), Name = "Greek Yogurt",     Brand = "Chobani",        Unit = "g",  UnitSize = 500,  CategoryId = yogurtCat?.Id,  CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
        };

        await db.Products.AddRangeAsync(products);
        await db.SaveChangesAsync();

        // Seed price records for each product x store
        var stores   = await db.Stores.ToListAsync();
        var allProds = await db.Products.ToListAsync();

        var rng = new Random(42);
        var records = new List<PriceRecord>();

        foreach (var product in allProds)
        {
            foreach (var store in stores)
            {
                var basePrice = (decimal)(rng.NextDouble() * 8 + 1.5);
                records.Add(new PriceRecord
                {
                    Id         = Guid.NewGuid(),
                    ProductId  = product.Id,
                    StoreId    = store.Id,
                    Price      = Math.Round(basePrice, 2),
                    IsOnSale   = rng.Next(5) == 0,
                    Currency   = "USD",
                    Source     = "seed",
                    RecordedAt = DateTime.UtcNow,
                });
            }
        }

        await db.PriceRecords.AddRangeAsync(records);
        await db.SaveChangesAsync();
    }
}