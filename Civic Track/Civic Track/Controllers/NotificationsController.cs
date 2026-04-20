using Civic_Track.Data;
using Civic_Track.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Civic_Track.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class NotificationsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public NotificationsController(ApplicationDbContext context)
        {
            _context = context;
        }

        [HttpGet("user/{userId}")]
        public async Task<IActionResult> GetUserNotifications(Guid userId)
        {
            var query = _context.Notifications
                .Include(n => n.Complaint)
                .Where(n => n.UserId == userId)
                .OrderByDescending(n => n.CreatedAt);

            var notifications = await query.ToListAsync();

            return Ok(notifications);
        }

        [HttpGet("user/{userId}/unread")]
        public async Task<IActionResult> GetUnread(Guid userId)
        {
            var query = _context.Notifications
                .Include(n => n.Complaint)
                .Where(n => n.UserId == userId && !n.IsRead);

            var notifications = await query.ToListAsync();

            return Ok(notifications);
        }

        [HttpPut("mark-as-read/{id}")]
        public async Task<IActionResult> MarkAsRead(Guid id)
        {
            var notification = await _context.Notifications
                .FirstOrDefaultAsync(n => n.Id == id);

            if (notification == null)
                return NotFound();

            notification.IsRead = true;
            await _context.SaveChangesAsync();

            return Ok(new { message = "Marked as read" });
        }

        [HttpPut("mark-all-read/{userId}")]
        public async Task<IActionResult> MarkAllAsRead(Guid userId)
        {
            var notifications = await _context.Notifications
                .Where(n => n.UserId == userId && !n.IsRead)
                .ToListAsync();

            foreach (var n in notifications)
            {
                n.IsRead = true;
            }

            await _context.SaveChangesAsync();

            return Ok(new { message = "All marked as read" });
        }
    }
}