using Civic_Track.Models;
using Microsoft.EntityFrameworkCore;
using BCrypt.Net;

namespace Civic_Track.Data
{
    public static class DbInitializer
    {
        public static async Task SeedData(ApplicationDbContext context)
        {
            // 1. Ensure Database is created
            await context.Database.EnsureCreatedAsync();

            // 2. Seed Categories if empty
            if (!await context.Categories.AnyAsync())
            {
                var categories = new List<Category>
                {
                    new Category { Name = "Infrastructure & Public Works", Description = "Roads, water, and electricity issues." },
                    new Category { Name = "Public Safety & Security", Description = "Incident reporting and security concerns." },
                    new Category { Name = "Environmental Concerns", Description = "Sanitation, pollution, and nature protection." },
                    new Category { Name = "Governance & Transparency", Description = "Official misconduct or service delays." },
                    new Category { Name = "Social Welfare", Description = "Health and community support issues." }
                };
                await context.Categories.AddRangeAsync(categories);
            }

            // 3. Seed System Admin
            if (!await context.Users.AnyAsync(u => u.Email == "admin@civictrack.gov.rw"))
            {
                var admin = new User
                {
                    FullName = "System Administrator",
                    Email = "admin@civictrack.gov.rw",
                    Phone = "0780000001",
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword("Admin@123"),
                    Role = UserRole.Admin,
                    IsActive = true
                };
                await context.Users.AddAsync(admin);
            }

            // 4. Seed Specialized Investigation Officers
            var specializedOfficers = new List<User>
            {
                new User { FullName = "Eco Protection Officer", Email = "eco.officer@civictrack.gov.rw", Phone = "0780000003", PasswordHash = BCrypt.Net.BCrypt.HashPassword("Officer@123"), Role = UserRole.Officer, IsActive = true },
                new User { FullName = "Infrastructure Engineer", Email = "infra.officer@civictrack.gov.rw", Phone = "0780000004", PasswordHash = BCrypt.Net.BCrypt.HashPassword("Officer@123"), Role = UserRole.Officer, IsActive = true },
                new User { FullName = "Security Analyst", Email = "safety.officer@civictrack.gov.rw", Phone = "0780000005", PasswordHash = BCrypt.Net.BCrypt.HashPassword("Officer@123"), Role = UserRole.Officer, IsActive = true }
            };

            foreach (var off in specializedOfficers)
            {
                if (!await context.Users.AnyAsync(u => u.Email == off.Email))
                {
                    await context.Users.AddAsync(off);
                }
            }

            await context.SaveChangesAsync();
        }
    }
}
