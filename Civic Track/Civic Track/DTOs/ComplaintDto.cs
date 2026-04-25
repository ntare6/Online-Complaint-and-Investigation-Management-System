namespace Civic_Track.DTOs;

public class ComplaintDto
{
    public Guid Id { get; set; }
    public string TrackingCode { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string? Location { get; set; }
    public string? District { get; set; }
    public string? Sector { get; set; }
    public string? Cell { get; set; }
    public string? Village { get; set; }
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }
    public string CategoryName { get; set; } = string.Empty;
    public string Priority { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public bool IsAnonymous { get; set; }
    public bool IsEscalatedToLegal { get; set; }
    public string? LegalEscalationNote { get; set; }
    public string? CitizenName { get; set; }
    public string? AssignedOfficerName { get; set; }
    public Guid? AssignedOfficerId { get; set; }
    public DateTime SubmittedAt { get; set; }
    public DateTime? ResolvedAt { get; set; }
    public string? ResolutionNote { get; set; }
    public bool IsEscalated { get; set; }
    public string? EscalationReason { get; set; }
    public DateTime? EscalatedAt { get; set; }
    public int? Rating { get; set; }
    public string? FeedbackComment { get; set; }
    public DateTime? FeedbackSubmittedAt { get; set; }
    public DateTime? EstimatedResolutionDate { get; set; }
    public ICollection<ComplaintStatusHistoryDto> StatusHistory { get; set; } = [];
}
