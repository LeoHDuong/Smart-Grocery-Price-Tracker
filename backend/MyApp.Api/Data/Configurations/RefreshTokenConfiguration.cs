using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using MyApp.Api.Entities;

namespace MyApp.Api.Data.Configurations;

public class RefreshTokenConfiguration : IEntityTypeConfiguration<RefreshToken>
{
    public void Configure(EntityTypeBuilder<RefreshToken> builder)
    {
        builder.HasKey(t => t.Id);
        builder.Property(t => t.Id).HasDefaultValueSql("gen_random_uuid()");

        builder.Property(t => t.Token).IsRequired().HasMaxLength(512);
        builder.HasIndex(t => t.Token).IsUnique();

        builder.Property(t => t.ExpiresAt).IsRequired();
        builder.Property(t => t.CreatedAt).HasDefaultValueSql("now()");
        builder.Property(t => t.RevokedAt).IsRequired(false);

        builder.HasOne(t => t.User)
            .WithMany()
            .HasForeignKey(t => t.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        // Fast lookup by token string
        builder.HasIndex(t => t.UserId);
    }
}