using Civic_Track.Data;
using Civic_Track.Models;


    
namespace Civic_Track.Services
{
    public class NotificationService
    {
        private readonly ApplicationDbContext _context;

        public NotificationService(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task CreateNotification(Guid userId, string message, Guid? complaintId = null, NotificationType type = NotificationType.Internal)
        {
            var notification = new Notification
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                Message = message,
                ComplaintId = complaintId,
                IsRead = false,
                Type = type,
                DeliveryStatus = DeliveryStatus.Sent,
                CreatedAt = DateTime.UtcNow
            };

            if (type == NotificationType.External)
            {
                var user = await _context.Users.FindAsync(userId);
                if (user != null)
                {
                    // SIMULATE EXTERNAL DELIVERY (Email/SMS)
                    Console.WriteLine("=================================================");
                    Console.WriteLine($"[EXTERNAL NOTIFICATION] TO: {user.Email} / {user.Phone}");
                    Console.WriteLine($"MESSAGE: {message}");
                    Console.WriteLine("=================================================");
                }
            }

            _context.Notifications.Add(notification);
            await _context.SaveChangesAsync();
        }
    }
}