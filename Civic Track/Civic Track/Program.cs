using Civic_Track.Data;
using Civic_Track.Services;
using Microsoft.EntityFrameworkCore;
using System.Text.Json.Serialization;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers()
    .AddJsonOptions(opts => opts.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles);

builder.Services.AddScoped<NotificationService>();

// --- CORRECTED CORS POLICY ---
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend",
        policy =>
        {
            policy.WithOrigins(
                    "http://127.0.0.1:5500", 
                    "http://localhost:5500", 
                    "https://online-complaint-management.netlify.app",
                    "https://online-complaint-and-investigation.vercel.app"
                  )
                  .AllowAnyHeader()
                  .AllowAnyMethod();
        });
});

builder.Services.AddDbContext<ApplicationDbContext>(options =>
{
    var connectionString = builder.Configuration.GetConnectionString("DefaultConnection") 
                          ?? Environment.GetEnvironmentVariable("DATABASE_URL");

    if (!string.IsNullOrEmpty(connectionString) && connectionString.Contains("postgres"))
    {
        Console.WriteLine("SYSTEM CHECK: PostgreSQL link detected. Manual Parsing...");
        try 
        {
            var rawUrl = connectionString.Replace("postgresql://", "").Replace("postgres://", "");
            var userPassSide = rawUrl.Split('@')[0];
            var hostSide = rawUrl.Split('@')[1];
            var user = userPassSide.Split(':')[0];
            var pass = userPassSide.Split(':')[1];
            var hostPortSide = hostSide.Split('/')[0];
            var dbName = hostSide.Split('/')[1].Split('?')[0];
            var host = hostPortSide.Split(':')[0];
            var port = hostPortSide.Split(':')[1];

            var cleanConnectionString = $"Host={host};Port={port};Database={dbName};Username={user};Password={pass};SSL Mode=Require;Trust Server Certificate=true";
            options.UseNpgsql(cleanConnectionString);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"PARSING ERROR: {ex.Message}. Attempting raw fallback.");
            options.UseNpgsql(connectionString);
        }
    }
    else
    {
        options.UseSqlServer(connectionString);
    }
});

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseDefaultFiles();
app.UseStaticFiles();
app.UseCors("AllowFrontend");
app.UseAuthorization();
app.MapControllers();

using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    var context = services.GetRequiredService<ApplicationDbContext>();
    try {
        await DbInitializer.SeedData(context);
    }
    catch (Exception ex) {
        Console.WriteLine($"SYSTEM CHECK: Seeding Failed - {ex.Message}");
    }
}

app.Run();