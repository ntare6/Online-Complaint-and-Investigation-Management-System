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

// Database Configuration with Render URL Parser
builder.Services.AddDbContext<ApplicationDbContext>(options =>
{
    var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
    
    if (connectionString != null && connectionString.Contains("postgres://"))
    {
        // Convert postgres://user:pass@host:port/db to Key=Value format
        var databaseUri = new Uri(connectionString);
        var userInfo = databaseUri.UserInfo.Split(':');

        var pgConnectionString = $"Host={databaseUri.Host};Port={databaseUri.Port};Database={databaseUri.AbsolutePath.TrimStart('/')};Username={userInfo[0]};Password={userInfo[1]};SSL Mode=Require;Trust Server Certificate=true";
        
        options.UseNpgsql(pgConnectionString);
    }
    else
    {
        options.UseSqlServer(connectionString);
    }
});

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

// Automated Database Seeding
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    var context = services.GetRequiredService<ApplicationDbContext>();
    // This was failing before because of the connection string format
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