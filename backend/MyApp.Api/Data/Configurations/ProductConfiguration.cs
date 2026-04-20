using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using MyApp.Api.Entities;

namespace MyApp.Api.Data.Configurations;

public class ProductConfiguration : IEntityTypeConfiguration<Product>
{
    public void Configure(EntityTypeBuilder<Product> builder)
    {
        builder.HasKey(p => p.Id);
        builder.Property(p => p.Id).HasDefaultValueSql("gen_random_uuid()");

        builder.Property(p => p.Name).IsRequired().HasMaxLength(256);
        builder.Property(p => p.Brand).HasMaxLength(128);
        builder.Property(p => p.Unit).HasMaxLength(32);
        builder.Property(p => p.UnitSize).HasPrecision(10, 4);
        builder.Property(p => p.ImageUrl).HasMaxLength(512);

        builder.Property(p => p.CreatedAt).HasDefaultValueSql("now()");
        builder.Property(p => p.UpdatedAt).HasDefaultValueSql("now()");

        builder.HasOne(p => p.Category)
            .WithMany(c => c.Products)
            .HasForeignKey(p => p.CategoryId)
            .OnDelete(DeleteBehavior.SetNull)
            .IsRequired(false);

        // Index for name search
        builder.HasIndex(p => p.Name);
    }
}