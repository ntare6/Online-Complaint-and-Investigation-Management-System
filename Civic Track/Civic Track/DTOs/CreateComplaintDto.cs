using System.ComponentModel.DataAnnotations;

namespace Civic_Track.DTOs;

public class CreateComplaintDto
{
    [Required(ErrorMessage = "Title is required.")]
    [StringLength(200, MinimumLength = 5, ErrorMessage = "Title must be between 5 and 200 characters.")]
    public string Title { get; set; } = string.Empty;

    [Required(ErrorMessage = "Description is extremely critical and required.")]
    [StringLength(5000, ErrorMessage = "Description cannot exceed 5000 characters.")]
    public string Description { get; set; } = string.Empty;

    [MaxLength(200, ErrorMessage = "Location cannot exceed 200 characters.")]
    public string? Location { get; set; }
    public string? District { get; set; }
    public string? Sector { get; set; }
    public string? Cell { get; set; }
    public string? Village { get; set; }
    
    [Required]
    public Guid CategoryId { get; set; }
    
    [Required]
    [RegularExpression("^(Low|Medium|High|Critical)$", ErrorMessage = "Priority must be Low, Medium, High, or Critical.")]
    public string Priority { get; set; } = "Medium";
    
    public bool IsAnonymous { get; set; } = false;
    public Guid? CitizenId { get; set; }
}
