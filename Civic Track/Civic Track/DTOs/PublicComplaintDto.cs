namespace Civic_Track.DTOs;

public class PublicComplaintDto
{
    public string TrackingCode { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string CategoryName { get; set; } = string.Empty;
    public DateTime SubmittedAt { get; set; }
    public DateTime? LastUpdatedAt { get; set; }
}
