namespace Civic_Track.Models;

public class Evidence
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public string FileName { get; set; } = string.Empty;

    public string FilePath { get; set; } = string.Empty;

    public string FileType { get; set; } = string.Empty;

    public long FileSizeInBytes { get; set; }

    public DateTime UploadedAt { get; set; } = DateTime.UtcNow;

    public Guid ComplaintId { get; set; }
    public Complaint Complaint { get; set; } = null!;

    public Guid UploadedByUserId { get; set; }
    public User UploadedByUser { get; set; } = null!;
}
