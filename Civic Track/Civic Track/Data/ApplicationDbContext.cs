using Civic_Track.Models;
using Microsoft.EntityFrameworkCore;

namespace Civic_Track.Data
{
    public class ApplicationDbContext : DbContext
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : base(options) { }

        public DbSet<User> Users { get; set; }
        public DbSet<Complaint> Complaints { get; set; }
        public DbSet<Category> Categories { get; set; }
        public DbSet<Comment> Comments { get; set; }
        public DbSet<Evidence> Evidences { get; set; }
        public DbSet<ComplaintStatusHistory> StatusHistories { get; set; }
        public DbSet<Notification> Notifications { get; set; }
        public DbSet<Report> Reports { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

      
            modelBuilder.Entity<Complaint>()
                .HasOne(c => c.Citizen)
                .WithMany(u => u.Complaints)
                .HasForeignKey(c => c.CitizenId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Complaint>()
                .HasOne(c => c.AssignedOfficer)
                .WithMany()
                .HasForeignKey(c => c.AssignedOfficerId)
                .OnDelete(DeleteBehavior.Restrict);
        }
    }
}
