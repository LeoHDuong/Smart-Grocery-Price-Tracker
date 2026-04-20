using MyApp.Api.DTOs;

namespace MyApp.Api.Services.Interfaces;

public interface IStoreService
{
    Task<IEnumerable<StoreResponseDto>> GetAllAsync(CancellationToken ct = default);
    Task<StoreResponseDto?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<StoreResponseDto> CreateAsync(StoreCreateDto dto, CancellationToken ct = default);
    Task<StoreResponseDto?> UpdateAsync(Guid id, StoreUpdateDto dto, CancellationToken ct = default);
    Task<bool> DeleteAsync(Guid id, CancellationToken ct = default);
}

public interface IPriceRecordService
{
    /// <summary>Returns paged price records, optionally filtered.</summary>
    Task<PagedResult<PriceRecordResponseDto>> GetAllAsync(PriceRecordQueryDto query, CancellationToken ct = default);

    /// <summary>Returns full price history for a single product across all stores.</summary>
    Task<PriceHistoryDto?> GetHistoryAsync(Guid productId, CancellationToken ct = default);

    /// <summary>Records a new price. Used by scraper and staff endpoints.</summary>
    Task<PriceRecordResponseDto> RecordPriceAsync(PriceRecordCreateDto dto, CancellationToken ct = default);

    /// <summary>Bulk-records prices (scraper batch inserts).</summary>
    Task<int> RecordPricesBulkAsync(IEnumerable<PriceRecordCreateDto> dtos, CancellationToken ct = default);
}