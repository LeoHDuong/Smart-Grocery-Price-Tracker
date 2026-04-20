using Microsoft.EntityFrameworkCore;
using MyApp.Api.Data;
using MyApp.Api.DTOs;
using MyApp.Api.Entities;
using MyApp.Api.Services.Interfaces;

namespace MyApp.Api.Services;

public class ScraperJobService(AppDbContext db) : IScraperJobService
{
    public async Task<IEnumerable<ScraperJobResponseDto>> GetAllAsync(CancellationToken ct = default)
    {
        var jobs = await db.ScraperJobs
            .Include(j => j.Store)
            .AsNoTracking()
            .OrderByDescending(j => j.StartedAt)
            .ToListAsync(ct);

        return jobs.Select(MapToDto);
    }

    public async Task<IEnumerable<ScraperJobResponseDto>> GetByStoreAsync(
        Guid storeId, CancellationToken ct = default)
    {
        var jobs = await db.ScraperJobs
            .Where(j => j.StoreId == storeId)
            .Include(j => j.Store)
            .AsNoTracking()
            .OrderByDescending(j => j.StartedAt)
            .ToListAsync(ct);

        return jobs.Select(MapToDto);
    }

    public async Task<ScraperJobResponseDto?> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        var job = await LoadJobAsync(id, ct);
        return job is null ? null : MapToDto(job);
    }

    public async Task<ScraperJobResponseDto> CreateAsync(
        ScraperJobCreateDto dto, CancellationToken ct = default)
    {
        var job = new ScraperJob
        {
            Id              = Guid.NewGuid(),
            StoreId         = dto.StoreId,
            Status          = "Pending",
            ProductsScraped = 0,
            StartedAt       = DateTime.UtcNow,
        };

        db.ScraperJobs.Add(job);
        await db.SaveChangesAsync(ct);

        return await GetByIdAsync(job.Id, ct)
            ?? throw new InvalidOperationException("Job not found after creation.");
    }

    public async Task<ScraperJobResponseDto?> UpdateAsync(
        Guid id, ScraperJobUpdateDto dto, CancellationToken ct = default)
    {
        var job = await db.ScraperJobs.FindAsync([id], ct);
        if (job is null) return null;

        job.Status          = dto.Status;
        job.ProductsScraped = dto.ProductsScraped;
        job.ErrorMessage    = dto.ErrorMessage;
        job.FinishedAt      = dto.FinishedAt;

        await db.SaveChangesAsync(ct);
        return await GetByIdAsync(id, ct);
    }

    public async Task<ScraperJobResponseDto?> MarkRunningAsync(Guid id, CancellationToken ct = default)
    {
        var job = await db.ScraperJobs.FindAsync([id], ct);
        if (job is null) return null;

        job.Status    = "Running";
        job.StartedAt = DateTime.UtcNow;

        await db.SaveChangesAsync(ct);
        return await GetByIdAsync(id, ct);
    }

    public async Task<ScraperJobResponseDto?> MarkCompletedAsync(
        Guid id, int productsScraped, CancellationToken ct = default)
    {
        var job = await db.ScraperJobs.FindAsync([id], ct);
        if (job is null) return null;

        job.Status          = "Completed";
        job.ProductsScraped = productsScraped;
        job.FinishedAt      = DateTime.UtcNow;
        job.ErrorMessage    = null;

        await db.SaveChangesAsync(ct);
        return await GetByIdAsync(id, ct);
    }

    public async Task<ScraperJobResponseDto?> MarkFailedAsync(
        Guid id, string errorMessage, CancellationToken ct = default)
    {
        var job = await db.ScraperJobs.FindAsync([id], ct);
        if (job is null) return null;

        job.Status       = "Failed";
        job.FinishedAt   = DateTime.UtcNow;
        job.ErrorMessage = errorMessage;

        await db.SaveChangesAsync(ct);
        return await GetByIdAsync(id, ct);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private async Task<ScraperJob?> LoadJobAsync(Guid id, CancellationToken ct) =>
        await db.ScraperJobs
            .Include(j => j.Store)
            .AsNoTracking()
            .FirstOrDefaultAsync(j => j.Id == id, ct);

    private static ScraperJobResponseDto MapToDto(ScraperJob j) => new(
        j.Id,
        j.StoreId,
        j.Store.Name,
        j.Status,
        j.ProductsScraped,
        j.ErrorMessage,
        j.StartedAt,
        j.FinishedAt,
        j.FinishedAt.HasValue ? j.FinishedAt.Value - j.StartedAt : null);
}