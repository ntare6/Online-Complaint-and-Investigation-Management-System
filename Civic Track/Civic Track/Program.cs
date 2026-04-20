using Civic_Track.Data;
using Civic_Track.Services;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers();

// Add scoped services
builder.Services.AddScoped<NotificationService>();

// ADD THIS CORS POLICY:
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend",
        policy =>
        {
            policy.WithOrigins("http://127.0.0.1:5500", "http://localhost:5500")
                  .AllowAnyHeader()
                  .AllowAnyMethod();
        });
});

builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

// Serve HTML natively from wwwroot
app.UseDefaultFiles();
app.UseStaticFiles();

// ACTIVATE THE CORS POLICY HERE (Must be BEFORE UseAuthorization)
app.UseCors("AllowFrontend");

app.UseAuthorization();

app.MapControllers();

app.Run();
