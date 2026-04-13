namespace Civic_Track.DTOs;

public class ComplaintDto
{
    public Guid Id { get; set; }
    public string TrackingCode { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string? Location { get; set; }
    public string CategoryName { get; set; } = string.Empty;
    public string Priority { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public bool IsAnonymous { get; set; }
    public bool IsEscalatedToLegal { get; set; }
    public string? LegalEscalationNote { get; set; }
    public string? CitizenName { get; set; }
    public string? AssignedOfficerName { get; set; }
    public DateTime SubmittedAt { get; set; }
    public DateTime? ResolvedAt { get; set; }
}
