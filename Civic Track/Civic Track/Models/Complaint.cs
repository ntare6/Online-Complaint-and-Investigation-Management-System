namespace Civic_Track.Models;

public class Complaint
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public string TrackingCode { get; set; } = string.Empty;

    public string Title { get; set; } = string.Empty;

    public string Description { get; set; } = string.Empty;

    public string? Location { get; set; }

    public Guid CategoryId { get; set; }
    public Category Category { get; set; } = null!;

    public ComplaintPriority Priority { get; set; } = ComplaintPriority.Medium;

    public ComplaintStatus Status { get; set; } = ComplaintStatus.Pending;

    public bool IsAnonymous { get; set; } = false;

    public bool IsEscalatedToLegal { get; set; } = false;

    public string? LegalEscalationNote { get; set; }

    public DateTime SubmittedAt { get; set; } = DateTime.UtcNow;

    public DateTime? ResolvedAt { get; set; }

    public Guid? CitizenId { get; set; }
    public User? Citizen { get; set; }

    public Guid? AssignedOfficerId { get; set; }
    public User? AssignedOfficer { get; set; }

    public ICollection<ComplaintStatusHistory> StatusHistory { get; set; } = [];

    public ICollection<Comment> Comments { get; set; } = [];

    public ICollection<Evidence> Evidences { get; set; } = [];

    public ICollection<Notification> Notifications { get; set; } = [];
}
