using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using MyApp.Api.Entities;

namespace MyApp.Api.Data.Configurations;

public class UserConfiguration : IEntityTypeConfiguration<User>
{
    public void Configure(EntityTypeBuilder<User> builder)
    {
        builder.HasKey(u => u.Id);
        builder.Property(u => u.Id).HasDefaultValueSql("gen_random_uuid()");

        builder.Property(u => u.Email).IsRequired().HasMaxLength(256);
        builder.HasIndex(u => u.Email).IsUnique();

        builder.Property(u => u.PasswordHash).IsRequired();
        builder.Property(u => u.FullName).IsRequired().HasMaxLength(256);
        builder.Property(u => u.Role).IsRequired().HasMaxLength(32);

        builder.Property(u => u.CreatedAt).HasDefaultValueSql("now()");
        builder.Property(u => u.UpdatedAt).HasDefaultValueSql("now()");
    }
}