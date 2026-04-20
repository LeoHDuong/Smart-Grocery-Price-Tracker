using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using MyApp.Api.Data;
using MyApp.Api.DTOs;
using MyApp.Api.Entities;

namespace MyApp.Api.Services;

public class JwtService(AppDbContext db, IConfiguration config)
{
    private readonly string _secret     = config["Jwt:Secret"]      ?? throw new InvalidOperationException("Jwt:Secret is not configured.");
    private readonly string _issuer     = config["Jwt:Issuer"]      ?? "MyApp";
    private readonly string _audience   = config["Jwt:Audience"]    ?? "MyApp";
    private readonly int _accessMinutes = int.Parse(config["Jwt:AccessTokenMinutes"]  ?? "15");
    private readonly int _refreshDays   = int.Parse(config["Jwt:RefreshTokenDays"]    ?? "7");

    // ── Token generation ──────────────────────────────────────────────────────

    public async Task<TokenResponseDto> GenerateTokensAsync(User user, CancellationToken ct = default)
    {
        var accessToken  = GenerateAccessToken(user);
        var refreshToken = await GenerateRefreshTokenAsync(user.Id, ct);
        var expiresAt    = DateTime.UtcNow.AddMinutes(_accessMinutes);

        return new TokenResponseDto(
            accessToken,
            refreshToken.Token,
            expiresAt,
            MapUser(user));
    }

    // ── Refresh ───────────────────────────────────────────────────────────────

    public async Task<TokenResponseDto?> RefreshAsync(string rawRefreshToken, CancellationToken ct = default)
    {
        var stored = await db.RefreshTokens
            .Include(t => t.User)
            .FirstOrDefaultAsync(t => t.Token == rawRefreshToken, ct);

        if (stored is null || !stored.IsActive)
            return null;

        // Rotate: revoke old, issue new
        stored.RevokedAt = DateTime.UtcNow;

        var newRefresh = await GenerateRefreshTokenAsync(stored.UserId, ct);
        var newAccess  = GenerateAccessToken(stored.User);
        var expiresAt  = DateTime.UtcNow.AddMinutes(_accessMinutes);

        await db.SaveChangesAsync(ct);

        return new TokenResponseDto(
            newAccess,
            newRefresh.Token,
            expiresAt,
            MapUser(stored.User));
    }

    // ── Logout ────────────────────────────────────────────────────────────────

    public async Task<bool> RevokeAsync(string rawRefreshToken, CancellationToken ct = default)
    {
        var stored = await db.RefreshTokens
            .FirstOrDefaultAsync(t => t.Token == rawRefreshToken, ct);

        if (stored is null || stored.IsRevoked)
            return false;

        stored.RevokedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        return true;
    }

    // ── Cleanup (call periodically from a background job) ─────────────────────

    public async Task<int> PurgeExpiredAsync(CancellationToken ct = default)
    {
        var expired = await db.RefreshTokens
            .Where(t => t.ExpiresAt < DateTime.UtcNow || t.RevokedAt != null)
            .ToListAsync(ct);

        db.RefreshTokens.RemoveRange(expired);
        await db.SaveChangesAsync(ct);
        return expired.Count;
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private string GenerateAccessToken(User user)
    {
        var key   = new SymmetricSecurityKey(System.Text.Encoding.UTF8.GetBytes(_secret));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub,   user.Id.ToString()),
            new Claim(JwtRegisteredClaimNames.Email, user.Email),
            new Claim(JwtRegisteredClaimNames.Jti,   Guid.NewGuid().ToString()),
            new Claim(ClaimTypes.Role,               user.Role),
            new Claim("fullName",                    user.FullName),
        };

        var token = new JwtSecurityToken(
            issuer:             _issuer,
            audience:           _audience,
            claims:             claims,
            expires:            DateTime.UtcNow.AddMinutes(_accessMinutes),
            signingCredentials: creds);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    private async Task<RefreshToken> GenerateRefreshTokenAsync(Guid userId, CancellationToken ct)
    {
        var token = new RefreshToken
        {
            Id        = Guid.NewGuid(),
            UserId    = userId,
            Token     = GenerateSecureToken(),
            ExpiresAt = DateTime.UtcNow.AddDays(_refreshDays),
            CreatedAt = DateTime.UtcNow,
        };

        db.RefreshTokens.Add(token);
        await db.SaveChangesAsync(ct);
        return token;
    }

    private static string GenerateSecureToken()
    {
        var bytes = RandomNumberGenerator.GetBytes(64);
        return Convert.ToBase64String(bytes);
    }

    private static UserResponseDto MapUser(User u) =>
        new(u.Id, u.FullName, u.Email, u.Role, u.CreatedAt, u.UpdatedAt);
}