using Civic_Track.Data;
using Civic_Track.DTOs;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Civic_Track.Controllers;

[Route("api/[controller]")]
[ApiController]
public class UsersController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public UsersController(ApplicationDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<UserDto>>> GetAllUsers()
    {
        var users = await _context.Users.ToListAsync();
        return Ok(users.Select(u => new UserDto
        {
            Id = u.Id,
            FullName = u.FullName,
            Email = u.Email,
            Phone = u.Phone,
            Role = u.Role.ToString(),
            IsActive = u.IsActive
        }));
    }

    [HttpPut("{id}/deactivate")]
    public async Task<IActionResult> ToggleActivation(Guid id)
    {
        var user = await _context.Users.FindAsync(id);
        if (user == null) return NotFound("User not found in system registry.");

        user.IsActive = !user.IsActive; // Flip the activation switch
        await _context.SaveChangesAsync();

        return Ok(new { message = $"User access has been {(user.IsActive ? "restored" : "revoked")}." });
    }
}
