using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using MyApp.Api.Entities;

namespace MyApp.Api.Data.Configurations;

public class PriceRecordConfiguration : IEntityTypeConfiguration<PriceRecord>
{
    public void Configure(EntityTypeBuilder<PriceRecord> builder)
    {
        builder.HasKey(r => r.Id);
        builder.Property(r => r.Id).HasDefaultValueSql("gen_random_uuid()");

        builder.Property(r => r.Price).HasPrecision(10, 2).IsRequired();
        builder.Property(r => r.OriginalPrice).HasPrecision(10, 2);
        builder.Property(r => r.Currency).IsRequired().HasMaxLength(3).HasDefaultValue("USD");
        builder.Property(r => r.Source).IsRequired().HasMaxLength(32);
        builder.Property(r => r.RecordedAt).HasDefaultValueSql("now()");

        builder.HasOne(r => r.Product)
            .WithMany(p => p.PriceRecords)
            .HasForeignKey(r => r.ProductId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(r => r.Store)
            .WithMany(s => s.PriceRecords)
            .HasForeignKey(r => r.StoreId)
            .OnDelete(DeleteBehavior.Cascade);

        // Core query pattern: latest price per product per store
        builder.HasIndex(r => new { r.ProductId, r.StoreId, r.RecordedAt });
        // Price history queries by time
        builder.HasIndex(r => r.RecordedAt);
    }
}