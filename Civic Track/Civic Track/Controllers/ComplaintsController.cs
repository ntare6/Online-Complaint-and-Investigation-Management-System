using Civic_Track.Data;
using Civic_Track.DTOs;
using Civic_Track.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Civic_Track.Controllers;

[Route("api/[controller]")]
[ApiController]
public class ComplaintsController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public ComplaintsController(ApplicationDbContext context)
    {
        _context = context;
    }

    // GET: api/Complaints
    [HttpGet]
    public async Task<ActionResult<IEnumerable<ComplaintDto>>> GetComplaints()
    {
        var complaints = await _context.Complaints
            .Include(c => c.Category)
            .Include(c => c.Citizen)
            .Include(c => c.AssignedOfficer)
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
            .FirstOrDefaultAsync(c => c.TrackingCode == trackingCode);

        if (complaint == null)
            return NotFound();

        return Ok(MapToDto(complaint));
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
        if (dto.AssignedOfficerId != null) complaint.AssignedOfficerId = dto.AssignedOfficerId;

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
        }

        await _context.SaveChangesAsync();
        return NoContent();
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
        CategoryName = c.Category?.Name ?? string.Empty,
        Priority = c.Priority.ToString(),
        Status = c.Status.ToString(),
        IsAnonymous = c.IsAnonymous,
        IsEscalatedToLegal = c.IsEscalatedToLegal,
        LegalEscalationNote = c.LegalEscalationNote,
        CitizenName = c.IsAnonymous ? "Anonymous" : c.Citizen?.FullName,
        AssignedOfficerName = c.AssignedOfficer?.FullName,
        SubmittedAt = c.SubmittedAt,
        ResolvedAt = c.ResolvedAt
    };
}
