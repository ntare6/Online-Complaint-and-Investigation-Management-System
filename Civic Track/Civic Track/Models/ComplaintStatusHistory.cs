namespace Civic_Track.Models;

public class ComplaintStatusHistory
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid ComplaintId { get; set; }
    public Complaint Complaint { get; set; } = null!;

    public ComplaintStatus Status { get; set; }

    // Official note added by the officer or admin (visible to citizen)
    public string? AuthorityNote { get; set; }

    // Who made this status change
    public Guid? ChangedByUserId { get; set; }
    public User? ChangedByUser { get; set; }

    // Immutable timestamp — entries are never updated, only appended
    public DateTime ChangedAt { get; set; } = DateTime.UtcNow;
}
