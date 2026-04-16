const API_BASE_URL = 'http://localhost:5079/api'; 
document.addEventListener('DOMContentLoaded', () => {
    const categoryDropdown = document.getElementById('categoryDropdown');
    
    if (categoryDropdown) {
        loadCategories();
    }

    const submitBtn = document.getElementById('submitBtn');
    if (submitBtn) {
        submitBtn.addEventListener('click', submitComplaint);
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

async function submitComplaint() {

    const title = document.getElementById('complaintTitle')?.value;
    const categoryId = document.getElementById('categoryDropdown')?.value;
    const location = document.getElementById('incidentLocation')?.value;
    const description = document.getElementById('complaintDescription')?.value;

    if (!title || !categoryId) {
        alert("Please fill in the Title and Category!");
        return;
    }

   
    const payload = {
        title: title,
        description: description,
        location: location,
        categoryId: categoryId,
        priority: "Medium",
        isAnonymous: false,
        citizenId: null 
    };

    try {
        
        const response = await fetch(`${API_BASE_URL}/Complaints`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            const result = await response.json();
            alert(`Success! Your case was submitted. Your tracking code is: ${result.trackingCode}`);
            // Clear the form
            document.getElementById('complaintForm').reset();
        } else {
            const error = await response.text();
            alert("API Error: " + error);
        }

    } catch (error) {
        console.error("Network Error:", error);
        alert("Failed to connect to the server.");
    }
}
