document.addEventListener('DOMContentLoaded', () => {
    const tabs = document.querySelectorAll('.tab-btn');
    const contents = document.querySelectorAll('.tab-content');

    // Tab Navigation
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            contents.forEach(c => c.classList.remove('active'));

            tab.classList.add('active');
            document.getElementById(tab.dataset.target).classList.add('active');
        });
    });

    // Kaomoji Copy Functionality
    const kaomojiCards = document.querySelectorAll('.kaomoji-card');
    kaomojiCards.forEach(card => {
        card.addEventListener('click', () => {
            const text = card.innerText;
            navigator.clipboard.writeText(text).then(() => {
                const originalText = card.innerHTML;
                card.innerHTML = '<span>copied!</span>';
                setTimeout(() => {
                    card.innerHTML = originalText;
                }, 1500);
            });
        });
    });

    // Load Audios
    loadAudios();

    // Anon Request Submission
    const requestForm = document.getElementById('requestForm');
    requestForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const text = document.getElementById('requestText').value;
        const status = document.getElementById('formStatus');
        
        status.innerText = "Sending request...";
        
        try {
            const response = await fetch('/api/request', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ request: text })
            });
            
            if (response.ok) {
                status.innerText = "Request sent successfully.";
                requestForm.reset();
            } else {
                status.innerText = "Failed to send request.";
            }
        } catch (error) {
            status.innerText = "Error connecting to server.";
        }
    });

    // Admin Portal Logic
    const adminPass = document.getElementById('adminPass');
    const uploadSection = document.getElementById('uploadSection');
    
    adminPass.addEventListener('input', () => {
        // This is a basic frontend gate; actual security happens in the Vercel serverless function
        if (adminPass.value === 'sveta_admin_key') {
            uploadSection.style.display = 'block';
            adminPass.style.display = 'none';
        }
    });

    const uploadBtn = document.getElementById('uploadBtn');
    uploadBtn.addEventListener('click', async () => {
        const fileInput = document.getElementById('audioFile');
        const titleInput = document.getElementById('audioTitle');
        const status = document.getElementById('uploadStatus');

        if (!fileInput.files[0] || !titleInput.value) {
            status.innerText = "Please provide a file and a title.";
            return;
        }

        status.innerText = "Uploading to archive...";
        
        const formData = new FormData();
        formData.append('file', fileInput.files[0]);
        formData.append('title', titleInput.value);

        try {
            const response = await fetch('/api/upload', {
                method: 'POST',
                headers: {
                    'Authorization': adminPass.value
                },
                body: formData
            });

            if (response.ok) {
                status.innerText = "Upload complete.";
                loadAudios(); 
                titleInput.value = '';
                fileInput.value = '';
            } else {
                status.innerText = "Upload failed. Check authorization.";
            }
        } catch (error) {
            status.innerText = "Network error during upload.";
        }
    });
});

async function loadAudios() {
    const container = document.getElementById('audioContainer');
    try {
        const response = await fetch('/api/audios');
        if (response.ok) {
            const data = await response.json();
            container.innerHTML = '';
            
            if (data.length === 0) {
                container.innerHTML = '<p class="loading-text">The archive is currently empty.</p>';
                return;
            }

            data.forEach(audio => {
                const div = document.createElement('div');
                div.className = 'audio-item';
                div.innerHTML = `
                    <div class="audio-title">${audio.title}</div>
                    <audio controls controlsList="nodownload">
                        <source src="${audio.url}" type="audio/mpeg">
                        Your browser does not support the audio element.
                    </audio>
                `;
                container.appendChild(div);
            });
        }
    } catch (error) {
        container.innerHTML = '<p class="loading-text">Unable to connect to archive.</p>';
    }
}
