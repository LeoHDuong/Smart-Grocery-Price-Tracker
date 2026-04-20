using MyApp.Api.DTOs;

namespace MyApp.Api.Services.Interfaces;

public interface IUserService
{
    /// <summary>Registers a new user. Throws if email already exists.</summary>
    Task<UserResponseDto> RegisterAsync(RegisterDto dto, CancellationToken ct = default);

    /// <summary>Validates credentials. Returns the user if valid, null otherwise.</summary>
    Task<UserResponseDto?> ValidateCredentialsAsync(LoginDto dto, CancellationToken ct = default);

    /// <summary>Returns all users (admin use).</summary>
    Task<IEnumerable<UserResponseDto>> GetAllAsync(CancellationToken ct = default);

    /// <summary>Returns a single user by ID.</summary>
    Task<UserResponseDto?> GetByIdAsync(Guid id, CancellationToken ct = default);

    /// <summary>Returns a single user by email.</summary>
    Task<UserResponseDto?> GetByEmailAsync(string email, CancellationToken ct = default);

    /// <summary>Updates a user's profile fields.</summary>
    Task<UserResponseDto?> UpdateAsync(Guid id, UserUpdateDto dto, CancellationToken ct = default);

    /// <summary>Changes a user's password after verifying the current one.</summary>
    Task<bool> ChangePasswordAsync(Guid id, ChangePasswordDto dto, CancellationToken ct = default);

    /// <summary>Deletes a user. Returns false if not found.</summary>
    Task<bool> DeleteAsync(Guid id, CancellationToken ct = default);
}