namespace Civic_Track.DTOs;

public class ComplaintStatusHistoryDto
{
    public string Status { get; set; } = string.Empty;
    public string? AuthorityNote { get; set; }
    public string? ChangedByName { get; set; }
    public DateTime ChangedAt { get; set; }
}
