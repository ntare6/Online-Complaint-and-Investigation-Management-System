using System.ComponentModel.DataAnnotations;

namespace Civic_Track.DTOs;

public class CommentDto
{
    public Guid Id { get; set; }
    public string Content { get; set; } = string.Empty;
    public string AuthorName { get; set; } = string.Empty;
    public string AuthorRole { get; set; } = string.Empty;
    public string TrackingCode { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}

public class CreateCommentDto
{
    [Required(ErrorMessage = "Content cannot be empty.")]
    [StringLength(1000, MinimumLength = 2, ErrorMessage = "Remark must be between 2 and 1000 characters.")]
    public string Content { get; set; } = string.Empty;
    
    [Required]
    public Guid ComplaintId { get; set; }
    
    [Required]
    public Guid AuthorId { get; set; }
}
