using MyApp.Api.DTOs;

namespace MyApp.Api.Services.Interfaces;

public interface IPriceAlertService
{
    /// <summary>Returns all active (non-triggered) alerts for a user.</summary>
    Task<IEnumerable<PriceAlertResponseDto>> GetByUserAsync(Guid userId, bool includeTriggered = false, CancellationToken ct = default);

    /// <summary>Returns a single alert. Returns null if not found or not owned by user.</summary>
    Task<PriceAlertResponseDto?> GetByIdAsync(Guid id, Guid userId, CancellationToken ct = default);

    /// <summary>Creates a new price alert.</summary>
    Task<PriceAlertResponseDto> CreateAsync(Guid userId, PriceAlertCreateDto dto, CancellationToken ct = default);

    /// <summary>Updates target price or alert type.</summary>
    Task<PriceAlertResponseDto?> UpdateAsync(Guid id, Guid userId, PriceAlertUpdateDto dto, CancellationToken ct = default);

    /// <summary>Deletes an alert.</summary>
    Task<bool> DeleteAsync(Guid id, Guid userId, CancellationToken ct = default);

    /// <summary>
    /// Evaluates all untriggered alerts against the latest prices and marks
    /// triggered ones. Called by a background job after each scraper run.
    /// Returns the number of alerts triggered.
    /// </summary>
    Task<int> EvaluateAlertsAsync(CancellationToken ct = default);
}