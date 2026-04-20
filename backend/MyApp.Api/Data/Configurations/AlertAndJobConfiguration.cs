using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using MyApp.Api.Entities;

namespace MyApp.Api.Data.Configurations;

public class PriceAlertConfiguration : IEntityTypeConfiguration<PriceAlert>
{
    public void Configure(EntityTypeBuilder<PriceAlert> builder)
    {
        builder.HasKey(a => a.Id);
        builder.Property(a => a.Id).HasDefaultValueSql("gen_random_uuid()");

        builder.Property(a => a.TargetPrice).HasPrecision(10, 2).IsRequired();
        builder.Property(a => a.AlertType).IsRequired().HasMaxLength(32).HasDefaultValue("BelowPrice");
        builder.Property(a => a.CreatedAt).HasDefaultValueSql("now()");

        builder.HasOne(a => a.User)
            .WithMany(u => u.PriceAlerts)
            .HasForeignKey(a => a.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(a => a.Product)
            .WithMany(p => p.PriceAlerts)
            .HasForeignKey(a => a.ProductId)
            .OnDelete(DeleteBehavior.Cascade);

        // Efficient lookup: find untriggered alerts for a given product
        builder.HasIndex(a => new { a.ProductId, a.IsTriggered });
    }
}

public class ScraperJobConfiguration : IEntityTypeConfiguration<ScraperJob>
{
    public void Configure(EntityTypeBuilder<ScraperJob> builder)
    {
        builder.HasKey(j => j.Id);
        builder.Property(j => j.Id).HasDefaultValueSql("gen_random_uuid()");

        builder.Property(j => j.Status).IsRequired().HasMaxLength(32);
        builder.Property(j => j.ErrorMessage).HasMaxLength(2048);
        builder.Property(j => j.StartedAt).HasDefaultValueSql("now()");

        builder.HasOne(j => j.Store)
            .WithMany(s => s.ScraperJobs)
            .HasForeignKey(j => j.StoreId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(j => new { j.StoreId, j.StartedAt });
    }
}