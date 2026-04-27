using Civic_Track.Data;
using Civic_Track.Services;
using Microsoft.EntityFrameworkCore;
using System.Text.Json.Serialization;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers()
    .AddJsonOptions(opts => opts.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles);

builder.Services.AddScoped<NotificationService>();

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend",
        policy =>
        {
            policy.WithOrigins(
                    "http://127.0.0.1:5500", 
                    "http://localhost:5500", 
                    "https://online-complaint-management.netlify.app"
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
            // Remove the protocol prefix
            var rawUrl = connectionString.Replace("postgresql://", "").Replace("postgres://", "");
            
            // 1. Split user:pass from the rest (host/db)
            var parts = rawUrl.Split('@');
            var userPass = parts[0].Split(':');
            var remainder = parts[1];

            // 2. Split the host/port from the database name
            var hostPortAndDb = remainder.Split('/');
            var hostAndPort = hostPortAndDb[0];
            var dbName = hostPortAndDb[1];

            // 3. Separate host from port (if port exists)
            string host;
            string port = "5432"; // Default Postgres port

            if (hostAndPort.Contains(":"))
            {
                var hp = hostAndPort.Split(':');
                host = hp[0];
                port = hp[1];
            }
            else
            {
                host = hostAndPort;
            }

            var user = userPass[0];
            var pass = userPass[1];

            // Clean up any trailing parameters if they exist
            if (dbName.Contains("?")) dbName = dbName.Split('?')[0];

            Console.WriteLine($"SYSTEM CHECK: Target Host identified as: {host}");

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
        Console.WriteLine("SYSTEM CHECK: Defaulting to SQL Server...");
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

// Seeding moved to the end
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    var context = services.GetRequiredService<ApplicationDbContext>();
    Console.WriteLine("SYSTEM CHECK: Commencing Database Seeding...");
    try {
        await DbInitializer.SeedData(context);
        Console.WriteLine("SYSTEM CHECK: Seeding Successful.");
    } catch (Exception ex) {
        Console.WriteLine($"SEEDING ERROR: {ex.Message}");
    }
}

app.Run();