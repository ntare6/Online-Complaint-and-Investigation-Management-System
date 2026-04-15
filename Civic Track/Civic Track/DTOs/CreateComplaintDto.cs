namespace Civic_Track.DTOs;

public class CreateComplaintDto
{
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string? Location { get; set; }
    public Guid CategoryId { get; set; }
    public string Priority { get; set; } = "Medium";
    public bool IsAnonymous { get; set; } = false;
    public Guid? CitizenId { get; set; }
}
