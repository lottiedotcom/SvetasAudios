import { upload } from 'https://esm.sh/@vercel/blob@0.24.1/client?bundle';

document.addEventListener('DOMContentLoaded', () => {
    const tabs = document.querySelectorAll('.tab-btn');
    const contents = document.querySelectorAll('.tab-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            contents.forEach(c => c.classList.remove('active'));

            tab.classList.add('active');
            document.getElementById(tab.dataset.target).classList.add('active');
        });
    });

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

    loadAudios();

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

    const adminPass = document.getElementById('adminPass');
    const uploadSection = document.getElementById('uploadSection');
    
    adminPass.addEventListener('input', () => {
        if (adminPass.value.trim() === 'sveta_admin_key') {
            uploadSection.style.display = 'block';
            adminPass.style.display = 'none';
        }
    });

    const uploadBtn = document.getElementById('uploadBtn');
    uploadBtn.addEventListener('click', async () => {
        const fileInput = document.getElementById('audioFile');
        const titleInput = document.getElementById('audioTitle');
        const status = document.getElementById('uploadStatus');
        
        const progressWrapper = document.getElementById('progressWrapper');
        const progressBar = document.getElementById('progressBar');
        const progressText = document.getElementById('progressText');

        if (!fileInput.files[0] || !titleInput.value) {
            status.innerText = "Please provide a file and a title.";
            return;
        }

        status.innerText = "Transferring to archive (keep screen awake)...";
        
        // Give the bar a tiny initial width so the shimmer animation is immediately visible
        progressWrapper.style.display = 'block';
        progressText.style.display = 'block';
        progressBar.style.width = '2%';
        progressText.innerText = 'Preparing upload...';

        const file = fileInput.files[0];
        const extName = file.name.substring(file.name.lastIndexOf('.'));
        const finalName = titleInput.value + extName;

        try {
            await upload(finalName, file, {
                access: 'public',
                handleUploadUrl: '/api/upload',
                clientPayload: adminPass.value.trim(),
                multipart: true, 
                onUploadProgress: (event) => {
                    if (event.percentage !== undefined) {
                        const percent = Math.max(2, Math.round(event.percentage)); // Ensure it never visually drops below the 2% shimmer
                        progressBar.style.width = `${percent}%`;
                        progressText.innerText = `${percent}% Uploaded`;
                    }
                }
            });

            status.innerText = "Upload complete!";
            progressBar.style.width = '100%';
            progressText.innerText = '100% Complete';
            
            setTimeout(() => {
                progressWrapper.style.display = 'none';
                progressText.style.display = 'none';
            }, 3000);
            
            loadAudios(); 
            titleInput.value = '';
            fileInput.value = '';
        } catch (error) {
            status.innerText = "Upload failed. " + error.message;
            progressWrapper.style.display = 'none';
            progressText.style.display = 'none';
        }
    });
});

async function loadAudios() {
    const container = document.getElementById('audioContainer');
    try {
        const response = await fetch('/api/audios', { cache: 'no-store' });
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
                        <source src="${audio.url}">
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
