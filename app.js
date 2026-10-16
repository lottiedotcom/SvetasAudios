let globalAudios = [];

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
                setTimeout(() => { card.innerHTML = originalText; }, 1500);
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
        const audioInput = document.getElementById('audioFile');
        const coverInput = document.getElementById('coverFile');
        const titleInput = document.getElementById('audioTitle');
        const tagsInput = document.getElementById('audioTags');
        const status = document.getElementById('uploadStatus');
        const progressWrapper = document.getElementById('progressWrapper');
        const progressBar = document.getElementById('progressBar');
        const progressText = document.getElementById('progressText');

        if (!audioInput.files[0] || !titleInput.value) {
            status.innerText = "An audio file and title are required.";
            return;
        }

        const audioFile = audioInput.files[0];
        const coverFile = coverInput.files[0];

        progressWrapper.style.display = 'block';
        progressText.style.display = 'block';
        progressBar.style.width = '0%';
        progressText.innerText = '0%';

        // Added 'prefix' to generate clean, system-safe filenames for Cloudinary
        const pushToCloudinary = (file, prefix) => {
            return new Promise((resolve, reject) => {
                const xhr = new XMLHttpRequest();
                xhr.open('POST', 'https://api.cloudinary.com/v1_1/Ysnggol9/auto/upload');
                
                xhr.upload.onprogress = (e) => {
                    if (e.lengthComputable) {
                        const percent = Math.round((e.loaded / e.total) * 100);
                        progressBar.style.width = `${percent}%`;
                        progressText.innerText = `${percent}% Uploaded`;
                    }
                };

                xhr.onload = () => {
                    if (xhr.status >= 200 && xhr.status < 300) {
                        const data = JSON.parse(xhr.responseText);
                        resolve(data.secure_url);
                    } else {
                        reject(new Error('Cloudinary error: ' + xhr.responseText));
                    }
                };
                
                xhr.onerror = () => reject(new Error('Network error uploading to Cloudinary'));

                const formData = new FormData();
                formData.append('file', file);
                formData.append('upload_preset', 'ml_default');
                // This completely prevents the special character crash
                formData.append('public_id', `${prefix}_${Date.now()}`);
                xhr.send(formData);
            });
        };

        try {
            let coverUrl = null;
            
            if (coverFile) {
                status.innerText = "Step 1/2: Saving cover image...";
                coverUrl = await pushToCloudinary(coverFile, 'cover');
            }

            status.innerText = coverFile 
                ? "Step 2/2: Pushing audio track (keep screen awake)..." 
                : "Pushing audio track (keep screen awake)...";
            
            progressBar.style.width = '0%'; 
            const audioUrl = await pushToCloudinary(audioFile, 'audio');

            status.innerText = "Finalizing archive record...";
            const res = await fetch('/api/upload', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    password: adminPass.value.trim(),
                    title: titleInput.value.trim(), // Your beautiful symbols are saved here
                    tags: tagsInput.value.trim() || 'untagged',
                    audioUrl: audioUrl,
                    coverUrl: coverUrl
                })
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || 'Failed to save to database');
            }

            status.innerText = "Upload completely finished!";
            progressBar.style.width = '100%';
            progressText.innerText = 'Complete';
            
            setTimeout(() => {
                progressWrapper.style.display = 'none';
                progressText.style.display = 'none';
            }, 3000);
            
            loadAudios(); 
            titleInput.value = '';
            tagsInput.value = '';
            audioInput.value = '';
            if(coverInput) coverInput.value = '';

        } catch (error) {
            status.innerText = "Upload failed: " + error.message;
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
            globalAudios = await response.json();
            renderFilters();
            renderAudios('all');
        }
    } catch (error) {
        container.innerHTML = '<p class="loading-text">Unable to connect to archive.</p>';
    }
}

function renderFilters() {
    const filterBar = document.getElementById('filterBar');
    if (!filterBar) return;
    
    if (globalAudios.length === 0) {
        filterBar.innerHTML = '';
        return;
    }

    const tagsSet = new Set();
    globalAudios.forEach(item => {
        item.tags.forEach(t => {
            if(t.toLowerCase() !== 'untagged') tagsSet.add(t.toLowerCase());
        });
    });

    let html = `<button class="filter-pill active" data-tag="all">All</button>`;
    tagsSet.forEach(tag => {
        html += `<button class="filter-pill" data-tag="${tag}">${tag}</button>`;
    });
    
    filterBar.innerHTML = html;

    document.querySelectorAll('.filter-pill').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.filter-pill').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            renderAudios(e.target.dataset.tag);
        });
    });
}

function renderAudios(filterTag) {
    const container = document.getElementById('audioContainer');
    container.innerHTML = '';

    const filtered = filterTag === 'all' 
        ? globalAudios 
        : globalAudios.filter(a => a.tags.map(t=>t.toLowerCase()).includes(filterTag));

    if (filtered.length === 0) {
        container.innerHTML = '<p class="loading-text">No audios found.</p>';
        return;
    }

    filtered.forEach(audio => {
        const div = document.createElement('div');
        div.className = 'audio-item';
        
        let tagsHtml = audio.tags.filter(t => t !== 'untagged').map(t => `<span class="audio-tag">${t}</span>`).join('');
        let coverHtml = audio.coverUrl 
            ? `<img src="${audio.coverUrl}" class="audio-cover" alt="Cover">` 
            : `<div class="audio-cover fallback-cover">❀</div>`;

        div.innerHTML = `
            <div class="audio-header">
                ${coverHtml}
                <div class="audio-info">
                    <div class="audio-title">${audio.title}</div>
                    <div class="audio-tags-container">${tagsHtml}</div>
                </div>
            </div>
            <audio controls controlsList="nodownload">
                <source src="${audio.audioUrl}">
            </audio>
        `;
        container.appendChild(div);
    });
}
