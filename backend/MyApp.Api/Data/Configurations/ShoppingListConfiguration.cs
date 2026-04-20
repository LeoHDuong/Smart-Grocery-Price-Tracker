using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using MyApp.Api.Entities;

namespace MyApp.Api.Data.Configurations;

public class ShoppingListConfiguration : IEntityTypeConfiguration<ShoppingList>
{
    public void Configure(EntityTypeBuilder<ShoppingList> builder)
    {
        builder.HasKey(l => l.Id);
        builder.Property(l => l.Id).HasDefaultValueSql("gen_random_uuid()");

        builder.Property(l => l.Name).IsRequired().HasMaxLength(256);
        builder.Property(l => l.CreatedAt).HasDefaultValueSql("now()");

        builder.HasOne(l => l.User)
            .WithMany(u => u.ShoppingLists)
            .HasForeignKey(l => l.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(l => l.UserId);
    }
}

public class ShoppingListItemConfiguration : IEntityTypeConfiguration<ShoppingListItem>
{
    public void Configure(EntityTypeBuilder<ShoppingListItem> builder)
    {
        builder.HasKey(i => i.Id);
        builder.Property(i => i.Id).HasDefaultValueSql("gen_random_uuid()");

        builder.Property(i => i.Quantity).HasDefaultValue(1);
        builder.Property(i => i.TargetPrice).HasPrecision(10, 2);

        builder.HasOne(i => i.List)
            .WithMany(l => l.Items)
            .HasForeignKey(i => i.ListId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(i => i.Product)
            .WithMany(p => p.ShoppingListItems)
            .HasForeignKey(i => i.ProductId)
            .OnDelete(DeleteBehavior.Restrict);

        // Prevent duplicate product in same list
        builder.HasIndex(i => new { i.ListId, i.ProductId }).IsUnique();
    }
}