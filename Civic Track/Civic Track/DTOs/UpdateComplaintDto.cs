namespace Civic_Track.DTOs;

public class UpdateComplaintDto
{
    public string? Title { get; set; }
    public string? Description { get; set; }
    public string? Location { get; set; }
    public Guid? CategoryId { get; set; }
    public string? Priority { get; set; }
    public string? Status { get; set; }
    public Guid? AssignedOfficerId { get; set; }
    public bool? IsEscalatedToLegal { get; set; }
    public string? LegalEscalationNote { get; set; }
}
