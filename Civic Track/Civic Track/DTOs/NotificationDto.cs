namespace Civic_Track.DTOs;

public class NotificationDto
{
    public Guid Id { get; set; }
    public string Message { get; set; } = string.Empty;
    public bool IsRead { get; set; }
    public string? TrackingCode { get; set; }
    public DateTime CreatedAt { get; set; }
}
