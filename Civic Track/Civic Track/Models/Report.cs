namespace Civic_Track.Models;

public class Report
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public string Title { get; set; } = string.Empty;

    public ReportType Type { get; set; }

    public DateTime GeneratedAt { get; set; } = DateTime.UtcNow;

    public DateTime? FilterFromDate { get; set; }

    public DateTime? FilterToDate { get; set; }

    public ComplaintStatus? FilterByStatus { get; set; }

    public Guid? FilterByCategoryId { get; set; }
    public Category? FilterByCategory { get; set; }

    public Guid GeneratedByUserId { get; set; }
    public User GeneratedByUser { get; set; } = null!;
}
