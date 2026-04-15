const API_BASE_URL = 'http://localhost:5079/api'; 
document.addEventListener('DOMContentLoaded', () => {
    const categoryDropdown = document.getElementById('categoryDropdown');
    
    if (categoryDropdown) {
        loadCategories();
    }
});

async function loadCategories() {
    const dropdown = document.getElementById('categoryDropdown');
    
    try {
        const response = await fetch(`${API_BASE_URL}/Category`);
        
        if (!response.ok) {
            throw new Error('Failed to fetch categories');
        }
        const categories = await response.json();
        
        dropdown.innerHTML = '<option value="">-- Select a Category --</option>';

        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.id;        
            option.textContent = category.name;
            dropdown.appendChild(option);
        });

    } catch (error) {
        console.error("Error loading categories:", error);
        dropdown.innerHTML = '<option value="">Error loading categories. Is your API running?</option>';
    }
}
