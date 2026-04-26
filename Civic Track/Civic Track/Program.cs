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
    var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
    
    if (string.IsNullOrEmpty(connectionString))
    {
        connectionString = Environment.GetEnvironmentVariable("DATABASE_URL");
    }

    if (!string.IsNullOrEmpty(connectionString) && connectionString.Contains("postgres"))
    {
        Console.WriteLine("SYSTEM CHECK: PostgreSQL link detected. Parsing...");
        
        // Robust Parsing for postgresql://user:pass@host:port/db
        var uri = new Uri(connectionString.Replace("postgresql://", "https://").Replace("postgres://", "https://"));
        var userInfo = uri.UserInfo.Split(':');
        var user = userInfo[0];
        var password = userInfo[1];
        var host = uri.Host;
        var port = uri.Port == -1 ? 5432 : uri.Port; // Default to 5432 if port is missing
        var database = uri.AbsolutePath.TrimStart('/');

        connectionString = $"Host={host};Port={port};Database={database};Username={user};Password={password};SSL Mode=Require;Trust Server Certificate=true";
        
        options.UseNpgsql(connectionString);
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

using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    var context = services.GetRequiredService<ApplicationDbContext>();
    await DbInitializer.SeedData(context);
}

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

app.Run();