using Civic_Track.Data;
using Civic_Track.DTOs;
using Civic_Track.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Civic_Track.Controllers;

[Route("api/[controller]")]
[ApiController]
public class EvidenceController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly IWebHostEnvironment _env;

    public EvidenceController(ApplicationDbContext context, IWebHostEnvironment env)
    {
        _context = context;
        _env = env;
    }

    // POST: api/Evidence/upload
    [HttpPost("upload")]
    public async Task<ActionResult<EvidenceDto>> UploadEvidence([FromForm] CreateEvidenceDto dto)
    {
        if (dto.File == null || dto.File.Length == 0)
            return BadRequest("No file was uploaded.");

        var complaint = await _context.Complaints.FindAsync(dto.ComplaintId);
        if (complaint == null) return BadRequest("Complaint not found.");

        var user = await _context.Users.FindAsync(dto.UploadedByUserId);
        if (user == null) return BadRequest("User not found.");

        
        var uploadsFolder = Path.Combine(_env.WebRootPath ?? _env.ContentRootPath, "uploads");
        if (!Directory.Exists(uploadsFolder))
            Directory.CreateDirectory(uploadsFolder);

        
        var uniqueFileName = Guid.NewGuid().ToString() + "_" + dto.File.FileName;
        var filePath = Path.Combine(uploadsFolder, uniqueFileName);

        
        using (var stream = new FileStream(filePath, FileMode.Create))
        {
            await dto.File.CopyToAsync(stream);
        }


        var evidence = new Evidence
        {
            FileName = dto.File.FileName,
            FilePath = "/uploads/" + uniqueFileName, 
            FileType = dto.File.ContentType,
            FileSizeInBytes = dto.File.Length,
            ComplaintId = dto.ComplaintId,
            UploadedByUserId = dto.UploadedByUserId
        };

        _context.Evidences.Add(evidence);
        await _context.SaveChangesAsync();

        var created = await _context.Evidences
            .Include(e => e.Complaint)
            .Include(e => e.UploadedByUser)
            .FirstAsync(e => e.Id == evidence.Id);

        return Ok(MapToDto(created));
    }

    // GET: api/Evidence/complaint/{complaintId}
    [HttpGet("complaint/{complaintId}")]
    public async Task<ActionResult<IEnumerable<EvidenceDto>>> GetEvidenceByComplaint(Guid complaintId)
    {
        var evidence = await _context.Evidences
            .Include(e => e.Complaint)
            .Include(e => e.UploadedByUser)
            .Where(e => e.ComplaintId == complaintId)
            .OrderByDescending(e => e.UploadedAt)
            .ToListAsync();

        return Ok(evidence.Select(MapToDto));
    }

    private static EvidenceDto MapToDto(Evidence e) => new()
    {
        Id = e.Id,
        FileName = e.FileName,
        FilePath = e.FilePath,
        FileType = e.FileType,
        FileSizeInBytes = e.FileSizeInBytes,
        UploadedByName = e.UploadedByUser?.FullName ?? "Unknown",
        TrackingCode = e.Complaint?.TrackingCode ?? string.Empty,
        UploadedAt = e.UploadedAt
    };
}
