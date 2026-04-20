using Microsoft.EntityFrameworkCore;
using MyApp.Api.Entities;

namespace MyApp.Api.Data;

public static class DbSeeder
{
    public static async Task SeedAsync(AppDbContext db)
    {
        // Force-reset so the canonical product list is always in sync
        await db.PriceRecords.ExecuteDeleteAsync();
        await db.Products.ExecuteDeleteAsync();
        await db.Stores.ExecuteDeleteAsync();

        await SeedCategoriesAsync(db);
        await SeedStoresAsync(db);
        await SeedProductsAsync(db);
    }

    private static async Task SeedCategoriesAsync(AppDbContext db)
    {
        if (await db.Categories.AnyAsync()) return; // categories are stable; skip if present

        var roots = new List<Category>
        {
            new() { Id = Guid.NewGuid(), Name = "Dairy",     Slug = "dairy"     },
            new() { Id = Guid.NewGuid(), Name = "Meat",      Slug = "meat"      },
            new() { Id = Guid.NewGuid(), Name = "Produce",   Slug = "produce"   },
            new() { Id = Guid.NewGuid(), Name = "Pantry",    Slug = "pantry"    },
            new() { Id = Guid.NewGuid(), Name = "Beverages", Slug = "beverages" },
            new() { Id = Guid.NewGuid(), Name = "Frozen",    Slug = "frozen"    },
            new() { Id = Guid.NewGuid(), Name = "Bakery",    Slug = "bakery"    },
            new() { Id = Guid.NewGuid(), Name = "Snacks",    Slug = "snacks"    },
        };
        await db.Categories.AddRangeAsync(roots);
        await db.SaveChangesAsync();

        var dairy   = await db.Categories.FirstAsync(c => c.Slug == "dairy");
        var meat    = await db.Categories.FirstAsync(c => c.Slug == "meat");
        var produce = await db.Categories.FirstAsync(c => c.Slug == "produce");
        var pantry  = await db.Categories.FirstAsync(c => c.Slug == "pantry");

        var subs = new List<Category>
        {
            new() { Id = Guid.NewGuid(), Name = "Milk",       Slug = "milk",       ParentId = dairy.Id   },
            new() { Id = Guid.NewGuid(), Name = "Cheese",     Slug = "cheese",     ParentId = dairy.Id   },
            new() { Id = Guid.NewGuid(), Name = "Yogurt",     Slug = "yogurt",     ParentId = dairy.Id   },
            new() { Id = Guid.NewGuid(), Name = "Eggs",       Slug = "eggs",       ParentId = dairy.Id   },
            new() { Id = Guid.NewGuid(), Name = "Chicken",    Slug = "chicken",    ParentId = meat.Id    },
            new() { Id = Guid.NewGuid(), Name = "Beef",       Slug = "beef",       ParentId = meat.Id    },
            new() { Id = Guid.NewGuid(), Name = "Pork",       Slug = "pork",       ParentId = meat.Id    },
            new() { Id = Guid.NewGuid(), Name = "Seafood",    Slug = "seafood",    ParentId = meat.Id    },
            new() { Id = Guid.NewGuid(), Name = "Vegetables", Slug = "vegetables", ParentId = produce.Id },
            new() { Id = Guid.NewGuid(), Name = "Fruits",     Slug = "fruits",     ParentId = produce.Id },
            new() { Id = Guid.NewGuid(), Name = "Oils",       Slug = "oils",       ParentId = pantry.Id  },
            new() { Id = Guid.NewGuid(), Name = "Grains",     Slug = "grains",     ParentId = pantry.Id  },
            new() { Id = Guid.NewGuid(), Name = "Canned",     Slug = "canned",     ParentId = pantry.Id  },
            new() { Id = Guid.NewGuid(), Name = "Condiments", Slug = "condiments", ParentId = pantry.Id  },
        };
        await db.Categories.AddRangeAsync(subs);
        await db.SaveChangesAsync();
    }

    private static async Task SeedStoresAsync(AppDbContext db)
    {
        var stores = new List<Store>
        {
            new() { Id = Guid.NewGuid(), Name = "Walmart Supercenter", ChainName = "Walmart",      WebsiteUrl = "https://www.walmart.com",    CreatedAt = DateTime.UtcNow },
            new() { Id = Guid.NewGuid(), Name = "Costco Wholesale",    ChainName = "Costco",       WebsiteUrl = "https://www.costco.com",     CreatedAt = DateTime.UtcNow },
            new() { Id = Guid.NewGuid(), Name = "Whole Foods Market",  ChainName = "Whole Foods",  WebsiteUrl = "https://www.wholefoodsmarket.com", CreatedAt = DateTime.UtcNow },
            new() { Id = Guid.NewGuid(), Name = "Farmers Market",      ChainName = "Farmers Market", WebsiteUrl = null,                       CreatedAt = DateTime.UtcNow },
        };
        await db.Stores.AddRangeAsync(stores);
        await db.SaveChangesAsync();
    }

    private static async Task SeedProductsAsync(AppDbContext db)
    {
        // Load all leaf categories by slug
        var cat = (await db.Categories.ToListAsync()).ToDictionary(c => c.Slug, c => c.Id);

        Guid? C(string slug) => cat.TryGetValue(slug, out var id) ? id : null;

        // (name, brand, unit, unitSize, categorySlug)
        var defs = new (string Name, string? Brand, string Unit, decimal Size, string CatSlug)[]
        {
            // Dairy – Milk
            ("Whole Milk 1 Gal",        "Great Value",    "ml",   3785, "milk"),
            ("2% Reduced Fat Milk",      "Horizon Organic","ml",   1893, "milk"),
            ("Oat Milk",                 "Oatly",          "ml",   946,  "milk"),
            ("Almond Milk Unsweetened",  "Silk",           "ml",   946,  "milk"),
            // Dairy – Cheese
            ("Shredded Mozzarella",      "Kraft",          "g",    450,  "cheese"),
            ("Sharp Cheddar Block",      "Tillamook",      "g",    680,  "cheese"),
            ("Parmesan Grated",          "BelGioioso",     "g",    142,  "cheese"),
            ("Cream Cheese",             "Philadelphia",   "g",    226,  "cheese"),
            // Dairy – Yogurt
            ("Greek Yogurt Plain",       "Chobani",        "g",    907,  "yogurt"),
            ("Vanilla Yogurt",           "Siggi's",        "g",    150,  "yogurt"),
            // Dairy – Eggs
            ("Large Eggs Dozen",         "Kirkland",       "each", 12,   "eggs"),
            ("Free Range Eggs",          "Vital Farms",    "each", 12,   "eggs"),
            // Meat – Chicken
            ("Chicken Breast Boneless",  null,             "g",    900,  "chicken"),
            ("Chicken Thighs Bone-In",   null,             "g",    900,  "chicken"),
            ("Whole Rotisserie Chicken", null,             "each", 1,    "chicken"),
            // Meat – Beef
            ("80/20 Ground Beef",        null,             "g",    900,  "beef"),
            ("Ribeye Steak",             null,             "g",    300,  "beef"),
            ("Beef Chuck Roast",         null,             "g",    1360, "beef"),
            // Meat – Pork
            ("Pork Loin Chops",          null,             "g",    900,  "pork"),
            ("Bacon Thick Cut",          "Oscar Mayer",    "g",    454,  "pork"),
            // Meat – Seafood
            ("Atlantic Salmon Fillet",   null,             "g",    680,  "seafood"),
            ("Shrimp Large Frozen",      null,             "g",    907,  "seafood"),
            // Produce – Vegetables
            ("Broccoli Crown",           null,             "g",    400,  "vegetables"),
            ("Baby Spinach",             "Earthbound Farm","g",    142,  "vegetables"),
            ("Roma Tomatoes",            null,             "g",    680,  "vegetables"),
            ("Yellow Onions 3lb Bag",    null,             "g",    1360, "vegetables"),
            ("Russet Potatoes 5lb",      null,             "g",    2268, "vegetables"),
            ("Garlic Bulb",              null,             "each", 1,    "vegetables"),
            // Produce – Fruits
            ("Bananas",                  null,             "g",    680,  "fruits"),
            ("Strawberries",             null,             "g",    454,  "fruits"),
            ("Blueberries",              null,             "g",    340,  "fruits"),
            ("Gala Apples 3lb Bag",      null,             "g",    1360, "fruits"),
            ("Navel Oranges 4lb Bag",    null,             "g",    1814, "fruits"),
            // Pantry – Oils
            ("Extra Virgin Olive Oil",   "Kirkland",       "ml",   946,  "oils"),
            ("Avocado Oil",              "Chosen Foods",   "ml",   750,  "oils"),
            ("Coconut Oil Unrefined",    "Nutiva",         "g",    425,  "oils"),
            // Pantry – Grains
            ("Penne Pasta",              "Barilla",        "g",    454,  "grains"),
            ("Long Grain White Rice 5lb","Mahatma",        "g",    2268, "grains"),
            ("Brown Rice",               "Lundberg",       "g",    907,  "grains"),
            ("Rolled Oats",              "Bob's Red Mill", "g",    907,  "grains"),
            ("Whole Wheat Bread",        "Dave's Killer",  "g",    680,  "bakery"),
            // Pantry – Canned
            ("Canned Diced Tomatoes",    "Hunt's",         "g",    411,  "canned"),
            ("Canned Black Beans",       "Bush's",         "g",    425,  "canned"),
            ("Canned Chickpeas",         "Goya",           "g",    425,  "canned"),
            ("Chicken Broth 32oz",       "Swanson",        "ml",   946,  "canned"),
            // Pantry – Condiments
            ("Ketchup",                  "Heinz",          "ml",   570,  "condiments"),
            ("Yellow Mustard",           "French's",       "ml",   396,  "condiments"),
            ("Soy Sauce",                "Kikkoman",       "ml",   296,  "condiments"),
            ("Honey",                    "Nature Nate's",  "g",    340,  "condiments"),
            // Beverages
            ("Orange Juice 52oz",        "Tropicana",      "ml",   1538, "beverages"),
            ("Sparkling Water 12pk",     "LaCroix",        "ml",   4260, "beverages"),
            ("Green Tea",                "Bigelow",        "each", 40,   "beverages"),
            // Frozen
            ("Frozen Peas 16oz",         "Birds Eye",      "g",    454,  "frozen"),
            ("Frozen Pizza Margherita",  "DiGiorno",       "g",    793,  "frozen"),
            ("Vanilla Ice Cream",        "Tillamook",      "ml",   1420, "frozen"),
            // Snacks
            ("Tortilla Chips",           "Tostitos",       "g",    283,  "snacks"),
            ("Mixed Nuts",               "Kirkland",       "g",    907,  "snacks"),
        };

        var products = defs.Select(d => new Product
        {
            Id         = Guid.NewGuid(),
            Name       = d.Name,
            Brand      = d.Brand,
            Unit       = d.Unit,
            UnitSize   = d.Size,
            CategoryId = C(d.CatSlug),
            CreatedAt  = DateTime.UtcNow,
            UpdatedAt  = DateTime.UtcNow,
        }).ToList();

        await db.Products.AddRangeAsync(products);
        await db.SaveChangesAsync();

        // ── Per-store price matrix ────────────────────────────────────────────
        // Base prices are realistic; each store has a known profile:
        //   Walmart  = cheapest on staples, avg on specialty
        //   Costco   = bulk discount on most, unavailable for some singles
        //   Whole Foods = premium organic prices
        //   Farmers Market = best on produce/meat, avg elsewhere

        var stores = await db.Stores.ToListAsync();
        var walmart     = stores.First(s => s.ChainName == "Walmart");
        var costco      = stores.First(s => s.ChainName == "Costco");
        var wholefoods  = stores.First(s => s.ChainName == "Whole Foods");
        var farmers     = stores.First(s => s.ChainName == "Farmers Market");

        // (productName, walmart, costco, wholefoods, farmers, walmartSale, costcoSale, wfSale, fmSale)
        var prices = new (string Name, decimal Wm, decimal Co, decimal Wf, decimal Fm,
                          bool WmSale, bool CoSale, bool WfSale, bool FmSale)[]
        {
            ("Whole Milk 1 Gal",        3.48m,  3.19m,  5.99m,  4.50m,  false, false, false, false),
            ("2% Reduced Fat Milk",     3.28m,  2.89m,  5.49m,  4.25m,  false, false, false, false),
            ("Oat Milk",                3.98m,  3.49m,  5.29m,  4.99m,  false, false, true,  false),
            ("Almond Milk Unsweetened", 3.48m,  3.09m,  4.99m,  4.75m,  true,  false, false, false),
            ("Shredded Mozzarella",     3.98m,  3.49m,  6.99m,  5.99m,  false, false, false, false),
            ("Sharp Cheddar Block",     5.48m,  4.79m,  8.99m,  7.25m,  false, false, true,  false),
            ("Parmesan Grated",         4.28m,  3.89m,  7.49m,  6.50m,  false, false, false, false),
            ("Cream Cheese",            2.68m,  2.29m,  4.99m,  3.99m,  true,  false, false, false),
            ("Greek Yogurt Plain",      5.98m,  4.99m,  7.99m,  6.75m,  false, true,  false, false),
            ("Vanilla Yogurt",          1.98m,  1.79m,  3.49m,  2.99m,  false, false, true,  false),
            ("Large Eggs Dozen",        2.98m,  2.49m,  5.99m,  4.50m,  false, false, false, true),
            ("Free Range Eggs",         5.48m,  4.99m,  7.99m,  5.99m,  false, false, false, false),
            ("Chicken Breast Boneless", 5.98m,  4.99m,  9.99m,  7.49m,  false, true,  false, true),
            ("Chicken Thighs Bone-In",  3.98m,  3.49m,  7.49m,  5.25m,  true,  false, false, false),
            ("Whole Rotisserie Chicken",4.98m,  4.99m,  9.99m,  7.99m,  false, false, false, true),
            ("80/20 Ground Beef",       5.98m,  4.89m,  9.99m,  7.99m,  false, false, false, true),
            ("Ribeye Steak",           12.98m, 11.49m, 22.99m, 15.99m,  false, false, true,  false),
            ("Beef Chuck Roast",        7.98m,  6.99m, 13.99m,  9.99m,  true,  false, false, false),
            ("Pork Loin Chops",         4.98m,  3.99m,  8.99m,  6.49m,  false, true,  false, false),
            ("Bacon Thick Cut",         6.48m,  5.49m,  9.99m,  7.99m,  false, false, false, false),
            ("Atlantic Salmon Fillet",  9.98m,  8.99m, 16.99m, 12.99m,  false, false, true,  true),
            ("Shrimp Large Frozen",     8.98m,  7.49m, 14.99m, 10.99m,  true,  false, false, false),
            ("Broccoli Crown",          1.28m,  0.99m,  2.49m,  1.49m,  false, false, false, true),
            ("Baby Spinach",            3.48m,  2.99m,  4.99m,  3.25m,  false, false, false, true),
            ("Roma Tomatoes",           2.98m,  2.49m,  4.49m,  2.99m,  false, false, false, true),
            ("Yellow Onions 3lb Bag",   1.98m,  1.49m,  3.49m,  1.99m,  false, false, false, true),
            ("Russet Potatoes 5lb",     3.48m,  2.99m,  5.99m,  3.49m,  false, true,  false, true),
            ("Garlic Bulb",             0.68m,  0.49m,  1.49m,  0.79m,  false, false, false, true),
            ("Bananas",                 0.58m,  0.49m,  0.99m,  0.69m,  false, false, false, true),
            ("Strawberries",            3.98m,  3.49m,  5.99m,  4.25m,  true,  false, false, true),
            ("Blueberries",             4.98m,  3.99m,  6.99m,  4.99m,  false, false, true,  true),
            ("Gala Apples 3lb Bag",     3.98m,  3.29m,  5.99m,  4.25m,  false, false, false, true),
            ("Navel Oranges 4lb Bag",   3.48m,  2.99m,  5.49m,  3.99m,  false, true,  false, false),
            ("Extra Virgin Olive Oil",  8.98m,  6.99m, 13.99m, 10.99m,  false, false, true,  false),
            ("Avocado Oil",            10.98m,  8.99m, 14.99m, 12.49m,  false, false, false, false),
            ("Coconut Oil Unrefined",   7.48m,  5.99m, 11.99m,  9.99m,  false, true,  false, false),
            ("Penne Pasta",             1.28m,  0.99m,  2.99m,  2.49m,  false, false, true,  false),
            ("Long Grain White Rice 5lb",3.98m, 2.99m,  6.99m,  5.49m,  false, false, false, false),
            ("Brown Rice",              3.48m,  2.79m,  5.99m,  4.49m,  false, false, true,  false),
            ("Rolled Oats",             4.98m,  3.99m,  7.49m,  5.99m,  false, false, false, false),
            ("Whole Wheat Bread",       5.48m,  4.99m,  6.99m,  5.99m,  false, false, false, false),
            ("Canned Diced Tomatoes",   0.98m,  0.79m,  1.99m,  1.49m,  false, false, false, false),
            ("Canned Black Beans",      0.98m,  0.75m,  1.89m,  1.49m,  true,  false, false, false),
            ("Canned Chickpeas",        0.98m,  0.75m,  1.99m,  1.49m,  false, false, false, false),
            ("Chicken Broth 32oz",      1.98m,  1.69m,  3.49m,  2.49m,  false, false, true,  false),
            ("Ketchup",                 2.48m,  1.99m,  3.99m,  3.49m,  false, false, false, false),
            ("Yellow Mustard",          1.48m,  1.19m,  2.99m,  2.49m,  false, false, false, false),
            ("Soy Sauce",               2.98m,  2.49m,  4.99m,  3.99m,  false, false, true,  false),
            ("Honey",                   6.98m,  5.49m, 10.99m,  7.99m,  false, true,  false, false),
            ("Orange Juice 52oz",       3.98m,  3.49m,  6.49m,  5.49m,  true,  false, false, false),
            ("Sparkling Water 12pk",    4.98m,  3.99m,  6.99m,  5.99m,  false, false, true,  false),
            ("Green Tea",               3.48m,  2.99m,  5.49m,  4.49m,  false, false, false, false),
            ("Frozen Peas 16oz",        1.78m,  1.49m,  2.99m,  2.49m,  false, false, false, false),
            ("Frozen Pizza Margherita", 5.98m,  4.99m,  9.99m,  7.99m,  true,  false, true,  false),
            ("Vanilla Ice Cream",       4.98m,  3.99m,  8.99m,  6.99m,  false, true,  false, false),
            ("Tortilla Chips",          2.98m,  2.49m,  4.99m,  3.99m,  false, false, false, false),
            ("Mixed Nuts",             12.98m, 10.99m, 17.99m, 14.99m,  false, false, true,  false),
        };

        var allProds = await db.Products.ToListAsync();
        var records  = new List<PriceRecord>();

        foreach (var (name, wm, co, wf, fm, wmSale, coSale, wfSale, fmSale) in prices)
        {
            var prod = allProds.FirstOrDefault(p => p.Name == name);
            if (prod is null) continue;

            void AddRecord(Store store, decimal price, bool onSale)
            {
                var origPrice = onSale ? Math.Round(price * 1.15m, 2) : (decimal?)null;
                records.Add(new PriceRecord
                {
                    Id            = Guid.NewGuid(),
                    ProductId     = prod.Id,
                    StoreId       = store.Id,
                    Price         = price,
                    OriginalPrice = origPrice,
                    IsOnSale      = onSale,
                    Currency      = "USD",
                    Source        = "seed",
                    RecordedAt    = DateTime.UtcNow.AddDays(-new Random(prod.Id.GetHashCode()).Next(0, 7)),
                });
            }

            AddRecord(walmart,    wm, wmSale);
            AddRecord(costco,     co, coSale);
            AddRecord(wholefoods, wf, wfSale);
            AddRecord(farmers,    fm, fmSale);
        }

        await db.PriceRecords.AddRangeAsync(records);
        await db.SaveChangesAsync();
    }
}
