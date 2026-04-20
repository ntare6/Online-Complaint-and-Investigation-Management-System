using System.ComponentModel.DataAnnotations;

namespace Civic_Track.DTOs;

public class RegisterDto
{
    [Required(ErrorMessage = "Official Name is mandated.")]
    [StringLength(100, MinimumLength = 3, ErrorMessage = "Name must be between 3 and 100 characters.")]
    public string FullName { get; set; } = string.Empty;

    [Required(ErrorMessage = "Email address is strictly required.")]
    [EmailAddress(ErrorMessage = "Invalid official Email format.")]
    public string Email { get; set; } = string.Empty;

    [Required(ErrorMessage = "Contact number is required.")]
    [RegularExpression(@"^07[2389]\d{7}$|^\+2507[2389]\d{7}$", ErrorMessage = "Phone must be a valid Rwandan number (e.g., 078xxxxxxx).")]
    public string Phone { get; set; } = string.Empty;

    [Required(ErrorMessage = "Password is required.")]
    [MinLength(8, ErrorMessage = "Password must be a minimum of 8 characters for security.")]
    [RegularExpression(@"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$", ErrorMessage = "Password must contain at least 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character.")]
    public string Password { get; set; } = string.Empty;

    public string? OtpCode { get; set; }
}
