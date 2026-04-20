using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Civic_Track.Data;

namespace Civic_Track.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AnalyticsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public AnalyticsController(ApplicationDbContext context)
        {
            _context = context;
        }

        [HttpGet("total-complaints")]
        public async Task<IActionResult> GetTotalComplaints()
        {
            var total = await _context.Complaints.CountAsync();
            return Ok(new { totalComplaints = total });
        }

        [HttpGet("complaints-by-status")]
        public async Task<IActionResult> GetComplaintsByStatus()
        {
            var data = await _context.Complaints
                .GroupBy(c => c.Status.ToString())
                .Select(g => new
                {
                    status = g.Key,
                    count = g.Count()
                })
                .ToListAsync();

            return Ok(data);
        }

        [HttpGet("complaints-by-category")]
        public async Task<IActionResult> GetComplaintsByCategory()
        {
            var data = await _context.Complaints
                .Include(c => c.Category)
                .GroupBy(c => c.Category.Name)
                .Select(g => new
                {
                    category = g.Key,
                    count = g.Count()
                })
                .ToListAsync();

            return Ok(data);
        }

        [HttpGet("complaints-over-time")]
        public async Task<IActionResult> GetComplaintsOverTime()
        {
            var data = await _context.Complaints
                .GroupBy(c => c.SubmittedAt.Date)
                .Select(g => new
                {
                    date = g.Key.ToString("yyyy-MM-dd"),
                    count = g.Count()
                })
                .OrderBy(x => x.date)
                .ToListAsync();

            return Ok(data);
        }

        [HttpGet("dashboard-summary")]
        public async Task<IActionResult> GetDashboardSummary()
        {
            var total = await _context.Complaints.CountAsync();

            var pending = await _context.Complaints
                .CountAsync(c => c.Status == Civic_Track.Models.ComplaintStatus.Pending);

            var inProgress = await _context.Complaints
                .CountAsync(c => c.Status == Civic_Track.Models.ComplaintStatus.Investigating);

            var resolved = await _context.Complaints
                .CountAsync(c => c.Status == Civic_Track.Models.ComplaintStatus.Resolved);

            var resolutionRate = total == 0
                ? 0
                : (double)resolved / total * 100;

            return Ok(new
            {
                totalComplaints = total,
                pending,
                inProgress,
                resolved,
                resolutionRate = Math.Round(resolutionRate, 2)
            });
        }

        [HttpGet("report-detailed")]
        public async Task<IActionResult> GetReportDetailed(
            [FromQuery] DateTime? startDate,
            [FromQuery] DateTime? endDate,
            [FromQuery] Guid? categoryId)
        {
            var query = _context.Complaints.AsQueryable();

            if (startDate.HasValue)
                query = query.Where(c => c.SubmittedAt >= startDate.Value);

            if (endDate.HasValue)
                query = query.Where(c => c.SubmittedAt <= endDate.Value);

            if (categoryId.HasValue)
                query = query.Where(c => c.CategoryId == categoryId.Value);

            var complaints = await query.ToListAsync();

            var total = complaints.Count;
            var pending = complaints.Count(c => c.Status == Civic_Track.Models.ComplaintStatus.Pending);
            var inProgress = complaints.Count(c => c.Status == Civic_Track.Models.ComplaintStatus.Investigating);
            var resolved = complaints.Count(c => c.Status == Civic_Track.Models.ComplaintStatus.Resolved);
            var rejected = complaints.Count(c => c.Status == Civic_Track.Models.ComplaintStatus.Rejected);

            return Ok(new
            {
                total,
                pending,
                inProgress,
                resolved,
                rejected,
                breakdown = new[] {
                    new { label = "Pending", count = pending, color = "#fff9e6" },
                    new { label = "In Progress", count = inProgress, color = "#e6f0ff" },
                    new { label = "Resolved", count = resolved, color = "#e9f5ea" }
                }
            });
        }
    }
}