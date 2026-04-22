using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Civic_Track.Migrations
{
    /// <inheritdoc />
    public partial class AddEscalationAndFeedbackV3 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "EscalatedAt",
                table: "Complaints",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "EscalationReason",
                table: "Complaints",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "FeedbackComment",
                table: "Complaints",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "FeedbackSubmittedAt",
                table: "Complaints",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsEscalated",
                table: "Complaints",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<int>(
                name: "Rating",
                table: "Complaints",
                type: "int",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "EscalatedAt",
                table: "Complaints");

            migrationBuilder.DropColumn(
                name: "EscalationReason",
                table: "Complaints");

            migrationBuilder.DropColumn(
                name: "FeedbackComment",
                table: "Complaints");

            migrationBuilder.DropColumn(
                name: "FeedbackSubmittedAt",
                table: "Complaints");

            migrationBuilder.DropColumn(
                name: "IsEscalated",
                table: "Complaints");

            migrationBuilder.DropColumn(
                name: "Rating",
                table: "Complaints");

            migrationBuilder.DropColumn(
                name: "ResolutionNote",
                table: "Complaints");
        }
    }
}
