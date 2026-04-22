using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Civic_Track.Migrations
{
    /// <inheritdoc />
    public partial class AddResolutionDateAndChatSupport : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "EstimatedResolutionDate",
                table: "Complaints",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "AuthorRole",
                table: "Comments",
                type: "nvarchar(max)",
                nullable: true);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "EstimatedResolutionDate",
                table: "Complaints");

            migrationBuilder.DropColumn(
                name: "AuthorRole",
                table: "Comments");
        }
    }
}
