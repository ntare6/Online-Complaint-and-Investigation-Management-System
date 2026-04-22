using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Civic_Track.Migrations
{
    /// <inheritdoc />
    public partial class AddLocationHierarchyAndMoreCategories : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(name: "District", table: "Complaints", type: "nvarchar(max)", nullable: true);
            migrationBuilder.AddColumn<string>(name: "Sector", table: "Complaints", type: "nvarchar(max)", nullable: true);
            migrationBuilder.AddColumn<string>(name: "Cell", table: "Complaints", type: "nvarchar(max)", nullable: true);
            migrationBuilder.AddColumn<string>(name: "Village", table: "Complaints", type: "nvarchar(max)", nullable: true);

            // Seed additional categories
            migrationBuilder.InsertData(
                table: "Categories",
                columns: new[] { "Id", "Name", "Description" },
                values: new object[,]
                {
                    { Guid.NewGuid(), "Environmental Protection", "Reports related to pollution, deforestation, or illegal mining." },
                    { Guid.NewGuid(), "Public Infrastructure", "Damaged roads, bridges, or water systems." },
                    { Guid.NewGuid(), "Labor & Employment", "Unfair dismissal, workplace safety, or wage disputes." },
                    { Guid.NewGuid(), "Land Disputes", "Illegal land grabbing or boundary conflicts." },
                    { Guid.NewGuid(), "Domestic Violence", "Cases of abuse within the family or community." }
                });
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(name: "District", table: "Complaints");
            migrationBuilder.DropColumn(name: "Sector", table: "Complaints");
            migrationBuilder.DropColumn(name: "Cell", table: "Complaints");
            migrationBuilder.DropColumn(name: "Village", table: "Complaints");
        }
    }
}
