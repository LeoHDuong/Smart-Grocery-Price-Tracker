namespace MyApp.Api.DTOs;

public record UserCreateDto(string Name, string Email);
public record UserUpdateDto(string Name, string Email);