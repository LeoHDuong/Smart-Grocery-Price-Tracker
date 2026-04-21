using System.Text;
using MyApp.Api.Data;
using MyApp.Api.DTOs;
using MyApp.Api.Services;
using MyApp.Api.Services.Interfaces;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Security.Claims;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    // Allow pasting Bearer token in Swagger UI
    c.AddSecurityDefinition("Bearer", new Microsoft.OpenApi.Models.OpenApiSecurityScheme
    {
        Name         = "Authorization",
        Type         = Microsoft.OpenApi.Models.SecuritySchemeType.Http,
        Scheme       = "bearer",
        BearerFormat = "JWT",
        In           = Microsoft.OpenApi.Models.ParameterLocation.Header,
        Description  = "Enter your JWT access token."
    });
    c.AddSecurityRequirement(new Microsoft.OpenApi.Models.OpenApiSecurityRequirement
    {
        {
            new Microsoft.OpenApi.Models.OpenApiSecurityScheme
            {
                Reference = new Microsoft.OpenApi.Models.OpenApiReference
                {
                    Type = Microsoft.OpenApi.Models.ReferenceType.SecurityScheme,
                    Id   = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

// ── Database ──────────────────────────────────────────────────────────────────
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

// ── JWT Authentication ────────────────────────────────────────────────────────
var jwtSecret = builder.Configuration["Jwt:Secret"]
    ?? throw new InvalidOperationException("Jwt:Secret is not configured.");

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer           = true,
            ValidateAudience         = true,
            ValidateLifetime         = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer              = builder.Configuration["Jwt:Issuer"]   ?? "MyApp",
            ValidAudience            = builder.Configuration["Jwt:Audience"] ?? "MyApp",
            IssuerSigningKey         = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret)),
            ClockSkew                = TimeSpan.Zero, // no grace period on expiry
        };
    });

// ── Authorization policies ────────────────────────────────────────────────────
builder.Services.AddAuthorizationBuilder()
    .AddPolicy("StaffOnly", policy => policy.RequireRole("Staff"));

// ── CORS ──────────────────────────────────────────────────────────────────────
builder.Services.AddCors(o => o.AddDefaultPolicy(p =>
    p.WithOrigins("http://localhost:5173")
     .AllowAnyHeader()
     .AllowAnyMethod()));

// ── Services ──────────────────────────────────────────────────────────────────
builder.Services.AddScoped<JwtService>();
builder.Services.AddScoped<IUserService,         UserService>();
builder.Services.AddScoped<ICategoryService,     CategoryService>();
builder.Services.AddScoped<IProductService,      ProductService>();
builder.Services.AddScoped<IStoreService,        StoreService>();
builder.Services.AddScoped<IPriceRecordService,  PriceRecordService>();
builder.Services.AddScoped<IShoppingListService, ShoppingListService>();
builder.Services.AddScoped<IPriceAlertService,   PriceAlertService>();
builder.Services.AddScoped<IScraperJobService,   ScraperJobService>();

var app = builder.Build();

app.UseSwagger();
app.UseSwaggerUI();

app.UseCors();
app.UseAuthentication();
app.UseAuthorization();

// ── Dev seeder ────────────────────────────────────────────────────────────────
if (app.Environment.IsDevelopment())
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await DbSeeder.SeedAsync(db);
}

// ══════════════════════════════════════════════════════════════════════════════
// OCR  (mock — simulates receipt scanning)
// ══════════════════════════════════════════════════════════════════════════════

app.MapPost("/api/prices/ocr", async (IFormFile image, AppDbContext db) =>
{
    await Task.Delay(2500);

    var products = await db.Products
        .Include(p => p.PriceRecords)
        .ThenInclude(pr => pr.Store)
        .Where(p => p.PriceRecords.Any())
        .ToListAsync();

    if (products.Count == 0)
        return Results.Ok(Array.Empty<object>());

    var rng     = new Random();
    var picked  = products.OrderBy(_ => rng.Next()).Take(3).ToList();
    var results = picked.Select(p =>
    {
        var record = p.PriceRecords.OrderBy(_ => rng.Next()).First();
        var noise  = (decimal)(rng.NextDouble() * 0.4 - 0.2); // ±$0.20 scan variance
        var scannedPrice = Math.Max(0.01m, Math.Round(record.Price + noise, 2));
        return new
        {
            productId    = p.Id,
            productName  = p.Name,
            brand        = p.Brand,
            storeId      = record.StoreId,
            storeName    = record.Store.Name,
            scannedPrice,
        };
    });

    return Results.Ok(results);
})
.WithTags("OCR")
.DisableAntiforgery()
.RequireAuthorization();

// ══════════════════════════════════════════════════════════════════════════════
// AUTH  (public)
// ══════════════════════════════════════════════════════════════════════════════

app.MapPost("/auth/register", async (RegisterDto dto, IUserService svc, JwtService jwt) =>
{
    try
    {
        var user   = await svc.RegisterAsync(dto);
        // Fetch full entity to generate tokens
        var entity = await svc.GetByIdAsync(user.Id)
            ?? throw new InvalidOperationException("User not found after registration.");

        // Need User entity for JwtService — load it via DbContext directly
        // We return tokens immediately so the user is logged in after register
        return Results.Ok(new { message = "Registered successfully. Please log in." });
    }
    catch (InvalidOperationException ex)
    {
        return Results.Conflict(new { error = ex.Message });
    }
})
.WithTags("Auth")
.AllowAnonymous();

app.MapPost("/auth/login", async (LoginDto dto, IUserService svc, JwtService jwt, AppDbContext db) =>
{
    var userDto = await svc.ValidateCredentialsAsync(dto);
    if (userDto is null) return Results.Unauthorized();

    // Load entity for token generation
    var user = await db.Users.FindAsync(userDto.Id);
    if (user is null) return Results.Unauthorized();

    var tokens = await jwt.GenerateTokensAsync(user);
    return Results.Ok(tokens);
})
.WithTags("Auth")
.AllowAnonymous();

app.MapPost("/auth/refresh", async (RefreshTokenRequestDto dto, JwtService jwt) =>
{
    var tokens = await jwt.RefreshAsync(dto.RefreshToken);
    return tokens is null
        ? Results.Unauthorized()
        : Results.Ok(tokens);
})
.WithTags("Auth")
.AllowAnonymous();

app.MapPost("/auth/logout", async (LogoutDto dto, JwtService jwt) =>
{
    await jwt.RevokeAsync(dto.RefreshToken);
    return Results.NoContent();
})
.WithTags("Auth")
.RequireAuthorization();

// ══════════════════════════════════════════════════════════════════════════════
// USERS  (Staff only — users manage themselves via /auth endpoints)
// ══════════════════════════════════════════════════════════════════════════════

app.MapGet("/users", async (IUserService svc) =>
    Results.Ok(await svc.GetAllAsync()))
.WithTags("Users")
.RequireAuthorization("StaffOnly");

app.MapGet("/users/{id:guid}", async (Guid id, IUserService svc) =>
{
    var user = await svc.GetByIdAsync(id);
    return user is null ? Results.NotFound() : Results.Ok(user);
})
.WithTags("Users")
.RequireAuthorization("StaffOnly");

app.MapPut("/users/{id:guid}", async (Guid id, UserUpdateDto dto, IUserService svc) =>
{
    try
    {
        var user = await svc.UpdateAsync(id, dto);
        return user is null ? Results.NotFound() : Results.Ok(user);
    }
    catch (InvalidOperationException ex)
    {
        return Results.Conflict(new { error = ex.Message });
    }
})
.WithTags("Users")
.RequireAuthorization("StaffOnly");

app.MapPut("/users/{id:guid}/password", async (Guid id, ChangePasswordDto dto, IUserService svc) =>
{
    var success = await svc.ChangePasswordAsync(id, dto);
    return success
        ? Results.NoContent()
        : Results.BadRequest(new { error = "Invalid current password or user not found." });
})
.WithTags("Users")
.RequireAuthorization(); // any authenticated user (can change own password)

app.MapDelete("/users/{id:guid}", async (Guid id, IUserService svc) =>
{
    var success = await svc.DeleteAsync(id);
    return success ? Results.NoContent() : Results.NotFound();
})
.WithTags("Users")
.RequireAuthorization("StaffOnly");

// ══════════════════════════════════════════════════════════════════════════════
// CATEGORIES  (read: any auth user — write: Staff only)
// ══════════════════════════════════════════════════════════════════════════════

app.MapGet("/categories", async (ICategoryService svc) =>
    Results.Ok(await svc.GetAllAsync()))
.WithTags("Categories")
.RequireAuthorization();

app.MapGet("/categories/tree", async (ICategoryService svc) =>
    Results.Ok(await svc.GetTreeAsync()))
.WithTags("Categories")
.RequireAuthorization();

app.MapGet("/categories/{id:guid}", async (Guid id, ICategoryService svc) =>
{
    var category = await svc.GetByIdAsync(id);
    return category is null ? Results.NotFound() : Results.Ok(category);
})
.WithTags("Categories")
.RequireAuthorization();

app.MapPost("/categories", async (CategoryCreateDto dto, ICategoryService svc) =>
{
    try
    {
        var category = await svc.CreateAsync(dto);
        return Results.Created($"/categories/{category.Id}", category);
    }
    catch (InvalidOperationException ex)
    {
        return Results.Conflict(new { error = ex.Message });
    }
})
.WithTags("Categories")
.RequireAuthorization("StaffOnly");

app.MapPut("/categories/{id:guid}", async (Guid id, CategoryUpdateDto dto, ICategoryService svc) =>
{
    try
    {
        var category = await svc.UpdateAsync(id, dto);
        return category is null ? Results.NotFound() : Results.Ok(category);
    }
    catch (InvalidOperationException ex)
    {
        return Results.Conflict(new { error = ex.Message });
    }
})
.WithTags("Categories")
.RequireAuthorization("StaffOnly");

app.MapDelete("/categories/{id:guid}", async (Guid id, ICategoryService svc) =>
{
    try
    {
        var success = await svc.DeleteAsync(id);
        return success ? Results.NoContent() : Results.NotFound();
    }
    catch (InvalidOperationException ex)
    {
        return Results.BadRequest(new { error = ex.Message });
    }
})
.WithTags("Categories")
.RequireAuthorization("StaffOnly");

// ══════════════════════════════════════════════════════════════════════════════
// PRODUCTS  (read: any auth user — write: Staff only)
// ══════════════════════════════════════════════════════════════════════════════

app.MapGet("/products", async ([AsParameters] ProductQueryDto query, IProductService svc) =>
    Results.Ok(await svc.GetAllAsync(query)))
.WithTags("Products")
.RequireAuthorization();

app.MapGet("/products/{id:guid}", async (Guid id, IProductService svc) =>
{
    var product = await svc.GetByIdAsync(id);
    return product is null ? Results.NotFound() : Results.Ok(product);
})
.WithTags("Products")
.RequireAuthorization();

app.MapPost("/products/lowest-prices", async (List<Guid> productIds, IProductService svc) =>
    Results.Ok(await svc.GetLowestPricesAsync(productIds)))
.WithTags("Products")
.RequireAuthorization();

app.MapPost("/products", async (ProductCreateDto dto, IProductService svc) =>
{
    var product = await svc.CreateAsync(dto);
    return Results.Created($"/products/{product.Id}", product);
})
.WithTags("Products")
.RequireAuthorization("StaffOnly");

app.MapPut("/products/{id:guid}", async (Guid id, ProductUpdateDto dto, IProductService svc) =>
{
    var product = await svc.UpdateAsync(id, dto);
    return product is null ? Results.NotFound() : Results.Ok(product);
})
.WithTags("Products")
.RequireAuthorization("StaffOnly");

app.MapDelete("/products/{id:guid}", async (Guid id, IProductService svc) =>
{
    var success = await svc.DeleteAsync(id);
    return success ? Results.NoContent() : Results.NotFound();
})
.WithTags("Products")
.RequireAuthorization("StaffOnly");

// ══════════════════════════════════════════════════════════════════════════════
// STORES  (read: any auth user — write: Staff only)
// ══════════════════════════════════════════════════════════════════════════════

app.MapGet("/stores", async (IStoreService svc) =>
    Results.Ok(await svc.GetAllAsync()))
.WithTags("Stores")
.RequireAuthorization();

app.MapGet("/stores/{id:guid}", async (Guid id, IStoreService svc) =>
{
    var store = await svc.GetByIdAsync(id);
    return store is null ? Results.NotFound() : Results.Ok(store);
})
.WithTags("Stores")
.RequireAuthorization();

app.MapGet("/stores/{storeId:guid}/scraper-jobs", async (Guid storeId, IScraperJobService svc) =>
    Results.Ok(await svc.GetByStoreAsync(storeId)))
.WithTags("Stores")
.RequireAuthorization("StaffOnly");

app.MapPost("/stores", async (StoreCreateDto dto, IStoreService svc) =>
{
    var store = await svc.CreateAsync(dto);
    return Results.Created($"/stores/{store.Id}", store);
})
.WithTags("Stores")
.RequireAuthorization("StaffOnly");

app.MapPut("/stores/{id:guid}", async (Guid id, StoreUpdateDto dto, IStoreService svc) =>
{
    var store = await svc.UpdateAsync(id, dto);
    return store is null ? Results.NotFound() : Results.Ok(store);
})
.WithTags("Stores")
.RequireAuthorization("StaffOnly");

app.MapDelete("/stores/{id:guid}", async (Guid id, IStoreService svc) =>
{
    var success = await svc.DeleteAsync(id);
    return success ? Results.NoContent() : Results.NotFound();
})
.WithTags("Stores")
.RequireAuthorization("StaffOnly");

// ══════════════════════════════════════════════════════════════════════════════
// PRICE RECORDS  (read: any auth user — write: Staff only)
// ══════════════════════════════════════════════════════════════════════════════

app.MapGet("/prices", async ([AsParameters] PriceRecordQueryDto query, IPriceRecordService svc) =>
    Results.Ok(await svc.GetAllAsync(query)))
.WithTags("Prices")
.RequireAuthorization();

app.MapGet("/prices/history/{productId:guid}", async (Guid productId, IPriceRecordService svc) =>
{
    var history = await svc.GetHistoryAsync(productId);
    return history is null ? Results.NotFound() : Results.Ok(history);
})
.WithTags("Prices")
.RequireAuthorization();

app.MapPost("/prices", async (PriceRecordCreateDto dto, IPriceRecordService svc) =>
{
    var record = await svc.RecordPriceAsync(dto);
    return Results.Created($"/prices/{record.Id}", record);
})
.WithTags("Prices")
.RequireAuthorization("StaffOnly");

app.MapPost("/prices/bulk", async (List<PriceRecordCreateDto> dtos, IPriceRecordService svc) =>
{
    var count = await svc.RecordPricesBulkAsync(dtos);
    return Results.Ok(new { recorded = count });
})
.WithTags("Prices")
.RequireAuthorization("StaffOnly");

// ══════════════════════════════════════════════════════════════════════════════
// SHOPPING LISTS  (authenticated user — userId extracted from JWT claim)
// ══════════════════════════════════════════════════════════════════════════════

app.MapGet("/lists", async (ClaimsPrincipal principal, IShoppingListService svc) =>
{
    var userId = principal.GetUserId();
    return Results.Ok(await svc.GetByUserAsync(userId));
})
.WithTags("Shopping Lists")
.RequireAuthorization();

app.MapGet("/lists/{id:guid}", async (Guid id, ClaimsPrincipal principal, IShoppingListService svc) =>
{
    var userId = principal.GetUserId();
    var list   = await svc.GetByIdAsync(id, userId);
    return list is null ? Results.NotFound() : Results.Ok(list);
})
.WithTags("Shopping Lists")
.RequireAuthorization();

app.MapPost("/lists", async (ShoppingListCreateDto dto, ClaimsPrincipal principal, IShoppingListService svc) =>
{
    var userId = principal.GetUserId();
    var list   = await svc.CreateAsync(userId, dto);
    return Results.Created($"/lists/{list.Id}", list);
})
.WithTags("Shopping Lists")
.RequireAuthorization();

app.MapPut("/lists/{id:guid}", async (Guid id, ShoppingListUpdateDto dto, ClaimsPrincipal principal, IShoppingListService svc) =>
{
    var userId = principal.GetUserId();
    var list   = await svc.UpdateAsync(id, userId, dto);
    return list is null ? Results.NotFound() : Results.Ok(list);
})
.WithTags("Shopping Lists")
.RequireAuthorization();

app.MapDelete("/lists/{id:guid}", async (Guid id, ClaimsPrincipal principal, IShoppingListService svc) =>
{
    var userId  = principal.GetUserId();
    var success = await svc.DeleteAsync(id, userId);
    return success ? Results.NoContent() : Results.NotFound();
})
.WithTags("Shopping Lists")
.RequireAuthorization();

app.MapPost("/lists/{listId:guid}/items", async (
    Guid listId, ShoppingListItemAddDto dto, ClaimsPrincipal principal, IShoppingListService svc) =>
{
    try
    {
        var userId = principal.GetUserId();
        var item   = await svc.AddItemAsync(listId, userId, dto);
        return Results.Created($"/lists/{listId}/items/{item.Id}", item);
    }
    catch (InvalidOperationException ex)
    {
        return Results.NotFound(new { error = ex.Message });
    }
})
.WithTags("Shopping Lists")
.RequireAuthorization();

app.MapPut("/lists/{listId:guid}/items/{itemId:guid}", async (
    Guid listId, Guid itemId, ShoppingListItemUpdateDto dto,
    ClaimsPrincipal principal, IShoppingListService svc) =>
{
    var userId = principal.GetUserId();
    var item   = await svc.UpdateItemAsync(listId, itemId, userId, dto);
    return item is null ? Results.NotFound() : Results.Ok(item);
})
.WithTags("Shopping Lists")
.RequireAuthorization();

app.MapDelete("/lists/{listId:guid}/items/{itemId:guid}", async (
    Guid listId, Guid itemId, ClaimsPrincipal principal, IShoppingListService svc) =>
{
    var userId  = principal.GetUserId();
    var success = await svc.RemoveItemAsync(listId, itemId, userId);
    return success ? Results.NoContent() : Results.NotFound();
})
.WithTags("Shopping Lists")
.RequireAuthorization();

app.MapPost("/lists/{listId:guid}/reset", async (
    Guid listId, ClaimsPrincipal principal, IShoppingListService svc) =>
{
    var userId = principal.GetUserId();
    await svc.ResetCheckedAsync(listId, userId);
    return Results.NoContent();
})
.WithTags("Shopping Lists")
.RequireAuthorization();

// ══════════════════════════════════════════════════════════════════════════════
// PRICE ALERTS  (authenticated user — userId from JWT)
// ══════════════════════════════════════════════════════════════════════════════

app.MapGet("/alerts", async (bool includeTriggered, ClaimsPrincipal principal, IPriceAlertService svc) =>
{
    var userId = principal.GetUserId();
    return Results.Ok(await svc.GetByUserAsync(userId, includeTriggered));
})
.WithTags("Price Alerts")
.RequireAuthorization();

app.MapGet("/alerts/{id:guid}", async (Guid id, ClaimsPrincipal principal, IPriceAlertService svc) =>
{
    var userId = principal.GetUserId();
    var alert  = await svc.GetByIdAsync(id, userId);
    return alert is null ? Results.NotFound() : Results.Ok(alert);
})
.WithTags("Price Alerts")
.RequireAuthorization();

app.MapPost("/alerts", async (PriceAlertCreateDto dto, ClaimsPrincipal principal, IPriceAlertService svc) =>
{
    try
    {
        var userId = principal.GetUserId();
        var alert  = await svc.CreateAsync(userId, dto);
        return Results.Created($"/alerts/{alert.Id}", alert);
    }
    catch (InvalidOperationException ex)
    {
        return Results.Conflict(new { error = ex.Message });
    }
})
.WithTags("Price Alerts")
.RequireAuthorization();

app.MapPut("/alerts/{id:guid}", async (Guid id, PriceAlertUpdateDto dto, ClaimsPrincipal principal, IPriceAlertService svc) =>
{
    var userId = principal.GetUserId();
    var alert  = await svc.UpdateAsync(id, userId, dto);
    return alert is null ? Results.NotFound() : Results.Ok(alert);
})
.WithTags("Price Alerts")
.RequireAuthorization();

app.MapDelete("/alerts/{id:guid}", async (Guid id, ClaimsPrincipal principal, IPriceAlertService svc) =>
{
    var userId  = principal.GetUserId();
    var success = await svc.DeleteAsync(id, userId);
    return success ? Results.NoContent() : Results.NotFound();
})
.WithTags("Price Alerts")
.RequireAuthorization();

app.MapPost("/alerts/evaluate", async (IPriceAlertService svc) =>
{
    var triggered = await svc.EvaluateAlertsAsync();
    return Results.Ok(new { triggered });
})
.WithTags("Price Alerts")
.RequireAuthorization("StaffOnly");

// ══════════════════════════════════════════════════════════════════════════════
// SCRAPER JOBS  (Staff only)
// ══════════════════════════════════════════════════════════════════════════════

app.MapGet("/scraper-jobs", async (IScraperJobService svc) =>
    Results.Ok(await svc.GetAllAsync()))
.WithTags("Scraper Jobs")
.RequireAuthorization("StaffOnly");

app.MapGet("/scraper-jobs/{id:guid}", async (Guid id, IScraperJobService svc) =>
{
    var job = await svc.GetByIdAsync(id);
    return job is null ? Results.NotFound() : Results.Ok(job);
})
.WithTags("Scraper Jobs")
.RequireAuthorization("StaffOnly");

app.MapPost("/scraper-jobs", async (ScraperJobCreateDto dto, IScraperJobService svc) =>
{
    var job = await svc.CreateAsync(dto);
    return Results.Created($"/scraper-jobs/{job.Id}", job);
})
.WithTags("Scraper Jobs")
.RequireAuthorization("StaffOnly");

app.MapPut("/scraper-jobs/{id:guid}", async (Guid id, ScraperJobUpdateDto dto, IScraperJobService svc) =>
{
    var job = await svc.UpdateAsync(id, dto);
    return job is null ? Results.NotFound() : Results.Ok(job);
})
.WithTags("Scraper Jobs")
.RequireAuthorization("StaffOnly");

app.MapPost("/scraper-jobs/{id:guid}/running", async (Guid id, IScraperJobService svc) =>
{
    var job = await svc.MarkRunningAsync(id);
    return job is null ? Results.NotFound() : Results.Ok(job);
})
.WithTags("Scraper Jobs")
.RequireAuthorization("StaffOnly");

app.MapPost("/scraper-jobs/{id:guid}/completed", async (Guid id, int productsScraped, IScraperJobService svc) =>
{
    var job = await svc.MarkCompletedAsync(id, productsScraped);
    return job is null ? Results.NotFound() : Results.Ok(job);
})
.WithTags("Scraper Jobs")
.RequireAuthorization("StaffOnly");

app.MapPost("/scraper-jobs/{id:guid}/failed", async (Guid id, string errorMessage, IScraperJobService svc) =>
{
    var job = await svc.MarkFailedAsync(id, errorMessage);
    return job is null ? Results.NotFound() : Results.Ok(job);
})
.WithTags("Scraper Jobs")
.RequireAuthorization("StaffOnly");

app.Run();

// ── ClaimsPrincipal extension ─────────────────────────────────────────────────
public static class ClaimsPrincipalExtensions
{
    public static Guid GetUserId(this ClaimsPrincipal principal)
    {
        var value = principal.FindFirstValue(System.Security.Claims.ClaimTypes.NameIdentifier)
                 ?? principal.FindFirstValue("sub")
                 ?? throw new InvalidOperationException("User ID claim not found.");
        return Guid.Parse(value);
    }
}