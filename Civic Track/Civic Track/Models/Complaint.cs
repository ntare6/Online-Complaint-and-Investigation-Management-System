namespace Civic_Track.Models;

public class Complaint
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public string TrackingCode { get; set; } = string.Empty;

    public string Title { get; set; } = string.Empty;

    public string Description { get; set; } = string.Empty;

    public string? Location { get; set; }
    public string? District { get; set; }
    public string? Sector { get; set; }
    public string? Cell { get; set; }
    public string? Village { get; set; }

    // Stored GPS coordinates for emergency reports (nullable)
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }

    public Guid CategoryId { get; set; }

    public Category Category { get; set; } = null!;

    public ComplaintPriority Priority { get; set; } = ComplaintPriority.Medium;

    public ComplaintStatus Status { get; set; } = ComplaintStatus.Pending;

    public bool IsAnonymous { get; set; } = false;

    public bool IsEscalatedToLegal { get; set; } = false;

    public string? LegalEscalationNote { get; set; }

    public DateTime SubmittedAt { get; set; } = DateTime.UtcNow;

    public DateTime? ResolvedAt { get; set; }
    public string? ResolutionNote { get; set; }

    public bool IsEscalated { get; set; } = false;
    public string? EscalationReason { get; set; }
    public DateTime? EscalatedAt { get; set; }
    public DateTime? EstimatedResolutionDate { get; set; }

    public int? Rating { get; set; }
    public string? FeedbackComment { get; set; }
    public DateTime? FeedbackSubmittedAt { get; set; }

    public Guid? CitizenId { get; set; }
    public User? Citizen { get; set; }

    public Guid? AssignedOfficerId { get; set; }
    public User? AssignedOfficer { get; set; }

    public ICollection<ComplaintStatusHistory> StatusHistory { get; set; } = [];

    public ICollection<Comment> Comments { get; set; } = [];

    public ICollection<Evidence> Evidences { get; set; } = [];

    public ICollection<Notification> Notifications { get; set; } = [];
}
