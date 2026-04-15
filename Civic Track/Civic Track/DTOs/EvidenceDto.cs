namespace Civic_Track.DTOs;

public class EvidenceDto
{
    public Guid Id { get; set; }
    public string FileName { get; set; } = string.Empty;
    public string FileType { get; set; } = string.Empty;
    public long FileSizeInBytes { get; set; }
    public string UploadedByName { get; set; } = string.Empty;
    public string TrackingCode { get; set; } = string.Empty;
    public DateTime UploadedAt { get; set; }
}

public class CreateEvidenceDto
{
    
    public Guid ComplaintId { get; set; }
    
    
    public Guid UploadedByUserId { get; set; }
    
    
    public IFormFile File { get; set; } = null!;
}
