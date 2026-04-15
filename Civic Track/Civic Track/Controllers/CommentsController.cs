using Civic_Track.Data;
using Civic_Track.DTOs;
using Civic_Track.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Civic_Track.Controllers;

[Route("api/[controller]")]
[ApiController]
public class CommentsController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public CommentsController(ApplicationDbContext context)
    {
        _context = context;
    }

    // GET: api/Comments/complaint/{complaintId}
    // Returns all comments for a specific complaint
    [HttpGet("complaint/{complaintId}")]
    public async Task<ActionResult<IEnumerable<CommentDto>>> GetCommentsByComplaint(Guid complaintId)
    {
        var complaint = await _context.Complaints.FindAsync(complaintId);
        if (complaint == null)
            return NotFound("Complaint not found.");

        var comments = await _context.Comments
            .Include(c => c.Author)
            .Where(c => c.ComplaintId == complaintId)
            .OrderBy(c => c.CreatedAt)
            .ToListAsync();

        return Ok(comments.Select(MapToDto));
    }

    // GET: api/Comments/{id}
    [HttpGet("{id}")]
    public async Task<ActionResult<CommentDto>> GetComment(Guid id)
    {
        var comment = await _context.Comments
            .Include(c => c.Author)
            .Include(c => c.Complaint)
            .FirstOrDefaultAsync(c => c.Id == id);

        if (comment == null)
            return NotFound();

        return Ok(MapToDto(comment));
    }

    // POST: api/Comments
    // Citizens and Officers can post a comment on a complaint
    [HttpPost]
    public async Task<ActionResult<CommentDto>> CreateComment(CreateCommentDto dto)
    {
        var complaint = await _context.Complaints.FindAsync(dto.ComplaintId);
        if (complaint == null)
            return BadRequest("Complaint not found.");

        var author = await _context.Users.FindAsync(dto.AuthorId);
        if (author == null)
            return BadRequest("User not found.");

        var comment = new Comment
        {
            Content = dto.Content,
            ComplaintId = dto.ComplaintId,
            AuthorId = dto.AuthorId
        };

        _context.Comments.Add(comment);
        await _context.SaveChangesAsync();

        var created = await _context.Comments
            .Include(c => c.Author)
            .Include(c => c.Complaint)
            .FirstAsync(c => c.Id == comment.Id);

        return CreatedAtAction(nameof(GetComment), new { id = comment.Id }, MapToDto(created));
    }

    // DELETE: api/Comments/{id}
    // Only the author can delete their own comment
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteComment(Guid id)
    {
        var comment = await _context.Comments.FindAsync(id);
        if (comment == null)
            return NotFound();

        _context.Comments.Remove(comment);
        await _context.SaveChangesAsync();
        return NoContent();
    }

    private static CommentDto MapToDto(Comment c) => new()
    {
        Id = c.Id,
        Content = c.Content,
        AuthorName = c.Author?.FullName ?? "Unknown",
        AuthorRole = c.Author?.Role.ToString() ?? string.Empty,
        TrackingCode = c.Complaint?.TrackingCode ?? string.Empty,
        CreatedAt = c.CreatedAt
    };
}
