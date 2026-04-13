namespace Civic_Track.DTOs;

public class ReportDto
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public string GeneratedByName { get; set; } = string.Empty;
    public string? FilterByStatus { get; set; }
    public string? FilterByCategoryName { get; set; }
    public DateTime? FilterFromDate { get; set; }
    public DateTime? FilterToDate { get; set; }
    public DateTime GeneratedAt { get; set; }
}

public class CreateReportDto
{
    public string Title { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public string? FilterByStatus { get; set; }
    public Guid? FilterByCategoryId { get; set; }
    public DateTime? FilterFromDate { get; set; }
    public DateTime? FilterToDate { get; set; }
}
