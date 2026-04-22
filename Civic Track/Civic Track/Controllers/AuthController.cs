using Civic_Track.Data;
using Civic_Track.DTOs;
using Civic_Track.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using BCrypt.Net;

namespace Civic_Track.Controllers;

[Route("api/[controller]")]
[ApiController]
public class AuthController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public AuthController(ApplicationDbContext context)
    {
        _context = context;
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterDto dto)
    {
        // 1. Check for Duplicate Email (Return structured error for UI icons)
        if (await _context.Users.AnyAsync(u => u.Email == dto.Email))
        {
            return BadRequest(new { errors = new { Email = new[] { "An account with this official email already exists in our registry." } } });
        }

        // 2. IDENTITY CHALLENGE: Simulated OTP
        // If the request doesn't have an OTP, we stop here and ask the frontend to show the OTP screen.
        if (string.IsNullOrEmpty(dto.OtpCode))
        {
            return Ok(new { 
                verificationRequired = true, 
                message = "Verification Challenge: A 6-digit security code has been generated for " + dto.Email 
            });
        }

        // 3. Verify OTP (Hardcoded for demo/defense: 123456)
        if (dto.OtpCode != "123456")
        {
            return BadRequest(new { errors = new { OtpCode = new[] { "Invalid verification code. Please check your official documents or inbox." } } });
        }

        // 4. Final Enrollment
        var user = new User
        {
            Id = Guid.NewGuid(),
            FullName = dto.FullName,
            Email = dto.Email,
            NationalId = dto.NationalId,
            Phone = dto.Phone ?? string.Empty,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
            Role = UserRole.Citizen,
            IsActive = true
        };

        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Identity verified. Enrollment successful." });
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginDto dto)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == dto.Email);

        if (user == null || !BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash))
            return Unauthorized("Invalid email or password.");

        if (!user.IsActive)
            return Unauthorized("Your account has been deactivated.");

        var userDto = new UserDto
        {
            Id = user.Id,
            FullName = user.FullName,
            Email = user.Email,
            Phone = user.Phone,
            Role = user.Role.ToString(),
            IsActive = user.IsActive
        };

        return Ok(userDto);
    }
}
