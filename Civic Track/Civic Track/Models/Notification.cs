namespace Civic_Track.Models;

public enum NotificationType { Internal, External }
public enum DeliveryStatus { Pending, Sent, Failed }

public class Notification
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public string Message { get; set; } = string.Empty;

    public bool IsRead { get; set; } = false;
    
    public NotificationType Type { get; set; } = NotificationType.Internal;
    public DeliveryStatus DeliveryStatus { get; set; } = DeliveryStatus.Sent;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    public Guid? ComplaintId { get; set; }
    public Complaint? Complaint { get; set; }
}
