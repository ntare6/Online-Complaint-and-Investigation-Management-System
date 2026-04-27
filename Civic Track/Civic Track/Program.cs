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
            // This manual split is the safest way to handle 'postgresql://' on Render
            var rawUrl = connectionString.Replace("postgresql://", "").Replace("postgres://", "");
            
            // Split user:pass from host:port/db
            var parts = rawUrl.Split('@');
            var userPass = parts[0].Split(':');
            var hostPortDb = parts[1].Split('/');
            
            // Handle the host and port
            var hostPort = hostPortDb[0].Split(':');
            var host = hostPort[0];
            var port = hostPort.Length > 1 ? hostPort[1] : "5432";
            
            // Handle the database name
            var db = hostPortDb[1];
            
            var user = userPass[0];
            var pass = userPass[1];

            var cleanConnectionString = $"Host={host};Port={port};Database={db};Username={user};Password={pass};SSL Mode=Require;Trust Server Certificate=true";
            options.UseNpgsql(cleanConnectionString);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"PARSING ERROR: {ex.Message}. Using raw string as fallback.");
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

// Seeding happens last to ensure the app is ready to bind the port
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    var context = services.GetRequiredService<ApplicationDbContext>();
    Console.WriteLine("SYSTEM CHECK: Commencing Database Seeding...");
    await DbInitializer.SeedData(context);
}

app.Run();