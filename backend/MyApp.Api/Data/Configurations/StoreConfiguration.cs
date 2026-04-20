using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using MyApp.Api.Entities;

namespace MyApp.Api.Data.Configurations;

public class StoreConfiguration : IEntityTypeConfiguration<Store>
{
    public void Configure(EntityTypeBuilder<Store> builder)
    {
        builder.HasKey(s => s.Id);
        builder.Property(s => s.Id).HasDefaultValueSql("gen_random_uuid()");

        builder.Property(s => s.Name).IsRequired().HasMaxLength(256);
        builder.Property(s => s.ChainName).HasMaxLength(128);
        builder.Property(s => s.Address).HasMaxLength(512);
        builder.Property(s => s.WebsiteUrl).HasMaxLength(512);

        builder.Property(s => s.CreatedAt).HasDefaultValueSql("now()");
    }
}