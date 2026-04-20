using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using MyApp.Api.Entities;

namespace MyApp.Api.Data.Configurations;

public class CategoryConfiguration : IEntityTypeConfiguration<Category>
{
    public void Configure(EntityTypeBuilder<Category> builder)
    {
        builder.HasKey(c => c.Id);
        builder.Property(c => c.Id).HasDefaultValueSql("gen_random_uuid()");

        builder.Property(c => c.Name).IsRequired().HasMaxLength(128);
        builder.Property(c => c.Slug).IsRequired().HasMaxLength(128);
        builder.HasIndex(c => c.Slug).IsUnique();

        // Self-referential: parent category
        builder.HasOne(c => c.Parent)
            .WithMany(c => c.Children)
            .HasForeignKey(c => c.ParentId)
            .OnDelete(DeleteBehavior.Restrict)
            .IsRequired(false);
    }
}