using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;

namespace MyApp.Api.Services;

public class KrogerProduct
{
    public string productId { get; set; } = "";
    public string brand { get; set; } = "";
    public string description { get; set; } = "";
    public List<KrogerImage> images { get; set; } = new();
    public List<KrogerItem> items { get; set; } = new();
}

public class KrogerImage
{
    public string perspective { get; set; } = "";
    public List<KrogerImageSize> sizes { get; set; } = new();
}

public class KrogerImageSize
{
    public string size { get; set; } = "";
    public string url { get; set; } = "";
}

public class KrogerItem
{
    public string itemId { get; set; } = "";
    public KrogerPrice? price { get; set; }
}

public class KrogerPrice
{
    public decimal regular { get; set; }
    public decimal promo { get; set; }
}

public class KrogerSearchResponse
{
    public List<KrogerProduct> data { get; set; } = new();
}

public class KrogerTokenResponse
{
    public string access_token { get; set; } = "";
    public int expires_in { get; set; }
}

public class KrogerService
{
    private readonly HttpClient _http;
    private readonly IConfiguration _config;
    private string _token = "";
    private DateTime _tokenExpiry = DateTime.MinValue;
    private string _cachedLocationId = "";

    public KrogerService(HttpClient http, IConfiguration config)
    {
        _http = http;
        _config = config;
    }

    private async Task EnsureToken()
    {
        if (!string.IsNullOrEmpty(_token) && DateTime.UtcNow < _tokenExpiry)
            return;

        var clientId = _config["Kroger:ClientId"];
        var clientSecret = _config["Kroger:ClientSecret"];
        var credentials = Convert.ToBase64String(Encoding.UTF8.GetBytes($"{clientId}:{clientSecret}"));

        var req = new HttpRequestMessage(HttpMethod.Post, "https://api.kroger.com/v1/connect/oauth2/token");
        req.Headers.Authorization = new AuthenticationHeaderValue("Basic", credentials);
        req.Content = new FormUrlEncodedContent(new[]
        {
            new KeyValuePair<string, string>("grant_type", "client_credentials"),
            new KeyValuePair<string, string>("scope", "product.compact")
        });

        var resp = await _http.SendAsync(req);
        resp.EnsureSuccessStatusCode();

        var json = await resp.Content.ReadAsStringAsync();
        var token = JsonSerializer.Deserialize<KrogerTokenResponse>(json)!;
        _token = token.access_token;
        _tokenExpiry = DateTime.UtcNow.AddSeconds(token.expires_in - 60);
    }

    private async Task<string> GetLocationId()
    {
        if (!string.IsNullOrEmpty(_cachedLocationId))
            return _cachedLocationId;

        await EnsureToken();

        var zipCode = _config["Kroger:ZipCode"] ?? "45014";
        var req = new HttpRequestMessage(HttpMethod.Get,
            $"https://api.kroger.com/v1/locations?filter.zipCode.near={zipCode}&filter.limit=1");
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _token);
        req.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));

        var resp = await _http.SendAsync(req);
        if (!resp.IsSuccessStatusCode) return "";

        var json = await resp.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        _cachedLocationId = doc.RootElement
            .GetProperty("data")[0]
            .GetProperty("locationId")
            .GetString() ?? "";

        return _cachedLocationId;
    }

    public async Task<List<KrogerProduct>> SearchProducts(string query)
    {
        await EnsureToken();
        var locationId = await GetLocationId();

        var url = string.IsNullOrEmpty(locationId)
            ? $"https://api.kroger.com/v1/products?filter.term={Uri.EscapeDataString(query)}&filter.limit=10"
            : $"https://api.kroger.com/v1/products?filter.term={Uri.EscapeDataString(query)}&filter.locationId={locationId}&filter.limit=10";

        var req = new HttpRequestMessage(HttpMethod.Get, url);
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _token);
        req.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));

        var resp = await _http.SendAsync(req);
        resp.EnsureSuccessStatusCode();

        var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
        var json = await resp.Content.ReadAsStringAsync();
        var result = JsonSerializer.Deserialize<KrogerSearchResponse>(json, options);
        return result?.data ?? new();
    }
}