using Civic_Track.Data;
using Civic_Track.DTOs;
using Civic_Track.Models;
using Civic_Track.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Civic_Track.Controllers;

[Route("api/[controller]")]
[ApiController]
public class ComplaintsController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly NotificationService _notificationService;

    public ComplaintsController(ApplicationDbContext context, NotificationService notificationService)
    {
        _context = context;
        _notificationService = notificationService;
    }

    // GET: api/Complaints
    [HttpGet]
    public async Task<ActionResult<IEnumerable<ComplaintDto>>> GetComplaints()
    {
        var complaints = await _context.Complaints
            .Include(c => c.Category)
            .Include(c => c.Citizen)
            .Include(c => c.AssignedOfficer)
            .Include(c => c.StatusHistory)
                .ThenInclude(sh => sh.ChangedByUser)
            .ToListAsync();

        return Ok(complaints.Select(MapToDto));
    }

    // GET: api/Complaints/{id}
    [HttpGet("{id}")]
    public async Task<ActionResult<ComplaintDto>> GetComplaint(Guid id)
    {
        var complaint = await _context.Complaints
            .Include(c => c.Category)
            .Include(c => c.Citizen)
            .Include(c => c.AssignedOfficer)
            .Include(c => c.StatusHistory)
                .ThenInclude(sh => sh.ChangedByUser)
            .FirstOrDefaultAsync(c => c.Id == id);

        if (complaint == null)
            return NotFound();

        return Ok(MapToDto(complaint));
    }

    // GET: api/Complaints/track/{trackingCode}
    [HttpGet("track/{trackingCode}")]
    public async Task<ActionResult<ComplaintDto>> GetByTrackingCode(string trackingCode)
    {
        var complaint = await _context.Complaints
            .Include(c => c.Category)
            .Include(c => c.Citizen)
            .Include(c => c.AssignedOfficer)
            .Include(c => c.StatusHistory)
                .ThenInclude(sh => sh.ChangedByUser)
            .FirstOrDefaultAsync(c => c.TrackingCode == trackingCode);

        if (complaint == null)
            return NotFound();

        return Ok(MapToDto(complaint));
    }

    // GET: api/Complaints/public-track/{trackingCode}
    [HttpGet("public-track/{trackingCode}")]
    public async Task<ActionResult<PublicComplaintDto>> GetPublicByTrackingCode(string trackingCode)
    {
        var complaint = await _context.Complaints
            .Include(c => c.Category)
            .Include(c => c.StatusHistory)
            .FirstOrDefaultAsync(c => c.TrackingCode == trackingCode);

        if (complaint == null)
            return NotFound("Invalid tracking code.");

        var lastUpdate = complaint.StatusHistory
            .OrderByDescending(sh => sh.ChangedAt)
            .Select(sh => sh.ChangedAt)
            .FirstOrDefault();

        var dto = new PublicComplaintDto
        {
            TrackingCode = complaint.TrackingCode,
            Title = complaint.Title,
            Status = complaint.Status.ToString(),
            CategoryName = complaint.Category?.Name ?? "General",
            SubmittedAt = complaint.SubmittedAt,
            LastUpdatedAt = lastUpdate != default ? lastUpdate : complaint.SubmittedAt
        };

        return Ok(dto);
    }

    [HttpGet("citizen/{citizenId}")]
    public async Task<ActionResult<IEnumerable<ComplaintDto>>> GetByCitizen(Guid citizenId)
    {
        var complaints = await _context.Complaints
            .Include(c => c.Category)
            .Include(c => c.Citizen)
            .Include(c => c.AssignedOfficer)
            .Where(c => c.CitizenId == citizenId)
            .OrderByDescending(c => c.SubmittedAt)
            .ToListAsync();

        return Ok(complaints.Select(MapToDto));
    }

    // POST: api/Complaints
    [HttpPost]
    public async Task<ActionResult<ComplaintDto>> CreateComplaint(CreateComplaintDto dto)
    {
        var category = await _context.Categories.FindAsync(dto.CategoryId);
        if (category == null)
            return BadRequest("Invalid category.");

        var complaint = new Complaint
        {
            TrackingCode = "CT-" + Guid.NewGuid().ToString("N")[..8].ToUpper(),
            Title = dto.Title,
            Description = dto.Description,
            Location = dto.Location,
            District = dto.District,
            Sector = dto.Sector,
            Cell = dto.Cell,
            Village = dto.Village,
            Latitude = dto.Latitude,
            Longitude = dto.Longitude,
            CategoryId = dto.CategoryId,
            Priority = Enum.TryParse<ComplaintPriority>(dto.Priority, out var priority)
                ? priority : ComplaintPriority.Medium,
            IsAnonymous = dto.IsAnonymous,
            CitizenId = dto.IsAnonymous ? null : dto.CitizenId
        };

        _context.Complaints.Add(complaint);

        _context.StatusHistories.Add(new ComplaintStatusHistory
        {
            ComplaintId = complaint.Id,
            Status = ComplaintStatus.Pending,
            AuthorityNote = "Complaint submitted.",
            ChangedAt = DateTime.UtcNow
        });

        await _context.SaveChangesAsync();

        var created = await _context.Complaints
            .Include(c => c.Category)
            .Include(c => c.Citizen)
            .Include(c => c.AssignedOfficer)
            .FirstAsync(c => c.Id == complaint.Id);

        return CreatedAtAction(nameof(GetComplaint), new { id = complaint.Id }, MapToDto(created));
    }

    // PUT: api/Complaints/{id}
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateComplaint(Guid id, UpdateComplaintDto dto)
    {
        var complaint = await _context.Complaints.FindAsync(id);
        if (complaint == null)
            return NotFound();

        if (dto.Title != null) complaint.Title = dto.Title;
        if (dto.Description != null) complaint.Description = dto.Description;
        if (dto.Location != null) complaint.Location = dto.Location;
        if (dto.CategoryId != null) complaint.CategoryId = dto.CategoryId.Value;
        if (dto.IsEscalatedToLegal != null) complaint.IsEscalatedToLegal = dto.IsEscalatedToLegal.Value;
        if (dto.LegalEscalationNote != null) complaint.LegalEscalationNote = dto.LegalEscalationNote;
        if (dto.AssignedOfficerIdProvided) complaint.AssignedOfficerId = dto.AssignedOfficerId;
        if (dto.ResolutionNote != null) complaint.ResolutionNote = dto.ResolutionNote;

        if (dto.Priority != null && Enum.TryParse<ComplaintPriority>(dto.Priority, out var priority))
            complaint.Priority = priority;

        if (dto.Status != null && Enum.TryParse<ComplaintStatus>(dto.Status, out var status))
        {
            complaint.Status = status;

            if (status == ComplaintStatus.Resolved)
                complaint.ResolvedAt = DateTime.UtcNow;

            _context.StatusHistories.Add(new ComplaintStatusHistory
            {
                ComplaintId = complaint.Id,
                Status = status,
                ChangedAt = DateTime.UtcNow
            });

            // Create Notifications for Citizen
            if (complaint.CitizenId.HasValue)
            {
                // Internal Dashboard Alert
                await _notificationService.CreateNotification(
                    complaint.CitizenId.Value, 
                    $"Update: Your case {complaint.TrackingCode} is now {status}.", 
                    complaint.Id,
                    NotificationType.Internal
                );

                // Simulated External Notification (Email/SMS)
                await _notificationService.CreateNotification(
                    complaint.CitizenId.Value, 
                    $"CivicTrack: Your complaint {complaint.TrackingCode} has been updated to {status}. Please track it on the portal.", 
                    complaint.Id,
                    NotificationType.External
                );
            }
        }

        await _context.SaveChangesAsync();
        return NoContent();
    }

    // PUT: api/Complaints/{id}/escalate
    [HttpPut("{id}/escalate")]
    public async Task<IActionResult> EscalateComplaint(Guid id, [FromBody] string reason)
    {
        var complaint = await _context.Complaints.FindAsync(id);
        if (complaint == null) return NotFound();

        complaint.IsEscalated = true;
        complaint.EscalationReason = reason;
        complaint.EscalatedAt = DateTime.UtcNow;
        complaint.Status = ComplaintStatus.Escalated;

        _context.StatusHistories.Add(new ComplaintStatusHistory
        {
            ComplaintId = complaint.Id,
            Status = ComplaintStatus.Escalated,
            AuthorityNote = "Complaint escalated by citizen: " + reason,
            ChangedAt = DateTime.UtcNow
        });

        await _context.SaveChangesAsync();
        return NoContent();
    }

    // PUT: api/Complaints/{id}/feedback
    [HttpPut("{id}/feedback")]
    public async Task<IActionResult> SubmitFeedback(Guid id, [FromBody] FeedbackDto dto)
    {
        var complaint = await _context.Complaints.FindAsync(id);
        if (complaint == null) return NotFound();

        complaint.Rating = dto.Rating;
        complaint.FeedbackComment = dto.Comment;
        complaint.FeedbackSubmittedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return NoContent();
    }

    public class FeedbackDto
    {
        public int Rating { get; set; }
        public string Comment { get; set; } = string.Empty;
    }

    // DELETE: api/Complaints/{id}
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteComplaint(Guid id)
    {
        var complaint = await _context.Complaints.FindAsync(id);
        if (complaint == null)
            return NotFound();

        _context.Complaints.Remove(complaint);
        await _context.SaveChangesAsync();
        return NoContent();
    }

    private static ComplaintDto MapToDto(Complaint c) => new()
    {
        Id = c.Id,
        TrackingCode = c.TrackingCode,
        Title = c.Title,
        Description = c.Description,
        Location = c.Location,
        District = c.District,
        Sector = c.Sector,
        Cell = c.Cell,
        Village = c.Village,
        CategoryName = c.Category?.Name ?? string.Empty,
        Priority = c.Priority.ToString(),
        Status = c.Status.ToString(),
        IsAnonymous = c.IsAnonymous,
        IsEscalatedToLegal = c.IsEscalatedToLegal,
        LegalEscalationNote = c.LegalEscalationNote,
        CitizenName = c.IsAnonymous ? "Anonymous" : c.Citizen?.FullName,
        AssignedOfficerName = c.AssignedOfficer?.FullName,
        AssignedOfficerId = c.AssignedOfficerId,
        SubmittedAt = c.SubmittedAt,
        ResolvedAt = c.ResolvedAt,
        ResolutionNote = c.ResolutionNote,
        IsEscalated = c.IsEscalated,
        EscalationReason = c.EscalationReason,
        EscalatedAt = c.EscalatedAt,
        Rating = c.Rating,
        FeedbackComment = c.FeedbackComment,
        FeedbackSubmittedAt = c.FeedbackSubmittedAt,
        EstimatedResolutionDate = c.EstimatedResolutionDate,
        Latitude = c.Latitude,
        Longitude = c.Longitude,
        StatusHistory = c.StatusHistory.OrderBy(sh => sh.ChangedAt).Select(sh => new ComplaintStatusHistoryDto
        {
            Status = sh.Status.ToString(),
            AuthorityNote = sh.AuthorityNote,
            ChangedByName = sh.ChangedByUser?.FullName,
            ChangedAt = sh.ChangedAt
        }).ToList()
    };
}
