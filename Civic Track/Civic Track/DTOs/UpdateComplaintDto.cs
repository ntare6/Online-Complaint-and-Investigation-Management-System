using System.Text.Json.Serialization;

namespace Civic_Track.DTOs;

public class UpdateComplaintDto
{
    public string? Title { get; set; }
    public string? Description { get; set; }
    public string? Location { get; set; }
    public Guid? CategoryId { get; set; }
    public string? Priority { get; set; }
    public string? Status { get; set; }
    public bool? IsEscalatedToLegal { get; set; }
    public string? LegalEscalationNote { get; set; }
    public string? ResolutionNote { get; set; }

    // Sentinel pattern: lets us distinguish "not sent" vs "explicitly set to null" (unassign)
    private Guid? _assignedOfficerId;
    private bool _assignedOfficerIdProvided;

    public Guid? AssignedOfficerId
    {
        get => _assignedOfficerId;
        set { _assignedOfficerId = value; _assignedOfficerIdProvided = true; }
    }

    [JsonIgnore]
    public bool AssignedOfficerIdProvided => _assignedOfficerIdProvided;
}
