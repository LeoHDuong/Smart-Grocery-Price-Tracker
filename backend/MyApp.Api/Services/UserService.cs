using BCrypt.Net;
using Microsoft.EntityFrameworkCore;
using MyApp.Api.Data;
using MyApp.Api.DTOs;
using MyApp.Api.Entities;
using MyApp.Api.Services.Interfaces;

namespace MyApp.Api.Services;

public class UserService(AppDbContext db) : IUserService
{
    // ── Auth ──────────────────────────────────────────────────────────────────

    public async Task<UserResponseDto> RegisterAsync(RegisterDto dto, CancellationToken ct = default)
    {
        var exists = await db.Users.AnyAsync(u => u.Email == dto.Email.ToLower(), ct);
        if (exists)
            throw new InvalidOperationException($"Email '{dto.Email}' is already registered.");

        var user = new User
        {
            Id           = Guid.NewGuid(),
            FullName     = dto.FullName,
            Email        = dto.Email.ToLower(),
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
            Role         = dto.Role,
            CreatedAt    = DateTime.UtcNow,
            UpdatedAt    = DateTime.UtcNow,
        };

        db.Users.Add(user);
        await db.SaveChangesAsync(ct);
        return MapToDto(user);
    }

    public async Task<UserResponseDto?> ValidateCredentialsAsync(LoginDto dto, CancellationToken ct = default)
    {
        var user = await db.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Email == dto.Email.ToLower(), ct);

        if (user is null) return null;

        var valid = BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash);
        return valid ? MapToDto(user) : null;
    }

    // ── CRUD ──────────────────────────────────────────────────────────────────

    public async Task<IEnumerable<UserResponseDto>> GetAllAsync(CancellationToken ct = default)
    {
        var users = await db.Users
            .AsNoTracking()
            .OrderBy(u => u.FullName)
            .ToListAsync(ct);

        return users.Select(MapToDto);
    }

    public async Task<UserResponseDto?> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        var user = await db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == id, ct);
        return user is null ? null : MapToDto(user);
    }

    public async Task<UserResponseDto?> GetByEmailAsync(string email, CancellationToken ct = default)
    {
        var user = await db.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Email == email.ToLower(), ct);

        return user is null ? null : MapToDto(user);
    }

    public async Task<UserResponseDto?> UpdateAsync(Guid id, UserUpdateDto dto, CancellationToken ct = default)
    {
        var user = await db.Users.FindAsync([id], ct);
        if (user is null) return null;

        // Check email uniqueness if it changed
        if (!string.Equals(user.Email, dto.Email, StringComparison.OrdinalIgnoreCase))
        {
            var emailTaken = await db.Users
                .AnyAsync(u => u.Email == dto.Email.ToLower() && u.Id != id, ct);
            if (emailTaken)
                throw new InvalidOperationException($"Email '{dto.Email}' is already in use.");
        }

        user.FullName = dto.FullName;
        user.Email    = dto.Email.ToLower();
        // UpdatedAt is handled by AppDbContext.UpdateTimestamps()

        await db.SaveChangesAsync(ct);
        return MapToDto(user);
    }

    public async Task<bool> ChangePasswordAsync(Guid id, ChangePasswordDto dto, CancellationToken ct = default)
    {
        var user = await db.Users.FindAsync([id], ct);
        if (user is null) return false;

        var currentValid = BCrypt.Net.BCrypt.Verify(dto.CurrentPassword, user.PasswordHash);
        if (!currentValid) return false;

        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.NewPassword);
        await db.SaveChangesAsync(ct);
        return true;
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken ct = default)
    {
        var user = await db.Users.FindAsync([id], ct);
        if (user is null) return false;

        db.Users.Remove(user);
        await db.SaveChangesAsync(ct);
        return true;
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private static UserResponseDto MapToDto(User u) => new(
        u.Id, u.FullName, u.Email, u.Role, u.CreatedAt, u.UpdatedAt);
}