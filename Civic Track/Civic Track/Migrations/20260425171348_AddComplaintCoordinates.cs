using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Civic_Track.Migrations
{
    /// <inheritdoc />
    public partial class AddComplaintCoordinates : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<double>(
                name: "Latitude",
                table: "Complaints",
                type: "float",
                nullable: true);

            migrationBuilder.AddColumn<double>(
                name: "Longitude",
                table: "Complaints",
                type: "float",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Latitude",
                table: "Complaints");

            migrationBuilder.DropColumn(
                name: "Longitude",
                table: "Complaints");
        }
    }
}
