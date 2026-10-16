import { upload } from 'https://esm.sh/@vercel/blob@0.24.1/client?bundle';

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

        if (!audioInput.files[0] || !titleInput.value) {
            status.innerText = "An audio file and title are required.";
            return;
        }

        const audioFile = audioInput.files[0];
        const coverFile = coverInput.files[0];
        
        const uploadId = Date.now();
        const rawTags = tagsInput.value.trim() || 'untagged';
        const encTags = encodeURIComponent(rawTags);
        const encTitle = encodeURIComponent(titleInput.value.trim());

        progressWrapper.style.display = 'block';
        progressBar.style.width = '10%';
        
        try {
            // STEP 1: Upload Cover (if provided)
            if (coverFile) {
                status.innerText = "Saving cover image...";
                const coverExt = coverFile.name.substring(coverFile.name.lastIndexOf('.'));
                const coverName = `cover__${uploadId}__${encTags}__${encTitle}${coverExt}`;
                
                await upload(coverName, coverFile, {
                    access: 'public',
                    handleUploadUrl: '/api/upload',
                    clientPayload: adminPass.value.trim(),
                    contentType: coverFile.type
                });
                progressBar.style.width = '30%';
            }

            // STEP 2: Upload Audio
            status.innerText = "Pushing audio track... (Do not close tab or let screen sleep. This takes several minutes for large files.)";
            progressBar.style.width = '50%'; // Visual indicator that it is actively on the heaviest step

            const audioExt = audioFile.name.substring(audioFile.name.lastIndexOf('.'));
            const audioName = `audio__${uploadId}__${encTags}__${encTitle}${audioExt}`;

            await upload(audioName, audioFile, {
                access: 'public',
                handleUploadUrl: '/api/upload',
                clientPayload: adminPass.value.trim(),
                contentType: audioFile.type || 'audio/mp4'
            });

            progressBar.style.width = '100%';
            status.innerText = "Upload completely finished!";
            
            setTimeout(() => {
                progressWrapper.style.display = 'none';
            }, 3000);
            
            loadAudios(); 
            titleInput.value = '';
            tagsInput.value = '';
            audioInput.value = '';
            if(coverInput) coverInput.value = '';

        } catch (error) {
            status.innerText = "Upload failed: " + error.message;
            progressWrapper.style.display = 'none';
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
