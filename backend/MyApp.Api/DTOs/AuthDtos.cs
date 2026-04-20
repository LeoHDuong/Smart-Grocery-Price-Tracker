namespace MyApp.Api.DTOs;

public record TokenResponseDto(
    string AccessToken,
    string RefreshToken,
    DateTime AccessTokenExpiresAt,
    UserResponseDto User
);

public record RefreshTokenRequestDto(string RefreshToken);

public record LogoutDto(string RefreshToken);