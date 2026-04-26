# Use the .NET 8 SDK to build the app
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copy the project file and restore dependencies
COPY ["Civic Track.csproj", "./"]
RUN dotnet restore "Civic Track.csproj"

# Copy everything else and build the app
COPY . .
RUN dotnet publish "Civic Track.csproj" -c Release -o /app/publish

# Use the .NET 8 Runtime to run the app
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app
COPY --from=build /app/publish .

# Set the port Render expects
EXPOSE 10000
ENV ASPNETCORE_URLS=http://+:10000

ENTRYPOINT ["dotnet", "Civic Track.dll"]