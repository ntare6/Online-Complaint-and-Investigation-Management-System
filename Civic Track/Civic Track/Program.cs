using Civic_Track.Data;
using Civic_Track.Services;
using Microsoft.EntityFrameworkCore;
using System.Text.Json.Serialization;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers()
    .AddJsonOptions(opts => opts.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles);

builder.Services.AddScoped<NotificationService>();

// Configure CORS to support both local development and your live Netlify frontend
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend",
        policy =>
        {
            policy.WithOrigins(
                    "http://127.0.0.1:5500", 
                    "http://localhost:5500", 
                    "https://online-complaint-management.netlify.app"
                  )
                  .AllowAnyHeader()
                  .AllowAnyMethod();
        });
});

// Database Configuration: Switches between SQL Server (Local) and PostgreSQL (Render)
builder.Services.AddDbContext<ApplicationDbContext>(options =>
{
    var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
    
    // Render uses PostgreSQL; this check detects the 'postgres' keyword in your Render Environment Variable
    if (connectionString != null && connectionString.Contains("postgres"))
    {
        options.UseNpgsql(connectionString);
    }
    else
    {
        options.UseSqlServer(connectionString);
    }
});

builder.Services.AddOpenApi();

var app = builder.Build();

// Automated Database Seeding
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    var context = services.GetRequiredService<ApplicationDbContext>();
    await DbInitializer.SeedData(context);
}

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseDefaultFiles();
app.UseStaticFiles();

app.UseCors("AllowFrontend");

app.UseAuthorization();

app.MapControllers();

app.Run();