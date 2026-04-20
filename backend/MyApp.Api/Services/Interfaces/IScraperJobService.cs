using MyApp.Api.DTOs;

namespace MyApp.Api.Services.Interfaces;

public interface IScraperJobService
{
    Task<IEnumerable<ScraperJobResponseDto>> GetAllAsync(CancellationToken ct = default);
    Task<IEnumerable<ScraperJobResponseDto>> GetByStoreAsync(Guid storeId, CancellationToken ct = default);
    Task<ScraperJobResponseDto?> GetByIdAsync(Guid id, CancellationToken ct = default);

    /// <summary>Creates a new job in "Pending" status.</summary>
    Task<ScraperJobResponseDto> CreateAsync(ScraperJobCreateDto dto, CancellationToken ct = default);

    /// <summary>Updates job status, progress, error message, and finish time.</summary>
    Task<ScraperJobResponseDto?> UpdateAsync(Guid id, ScraperJobUpdateDto dto, CancellationToken ct = default);

    /// <summary>Convenience: mark a job as started (sets Status = Running, StartedAt = now).</summary>
    Task<ScraperJobResponseDto?> MarkRunningAsync(Guid id, CancellationToken ct = default);

    /// <summary>Convenience: mark a job as completed.</summary>
    Task<ScraperJobResponseDto?> MarkCompletedAsync(Guid id, int productsScraped, CancellationToken ct = default);

    /// <summary>Convenience: mark a job as failed with an error message.</summary>
    Task<ScraperJobResponseDto?> MarkFailedAsync(Guid id, string errorMessage, CancellationToken ct = default);
}