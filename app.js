let globalAudios = [];
let isAdminUnlocked = false;
let activeAdminPass = '';

// SKELETON KEY LOGIC: Checks if the URL contains ?kee
const urlParams = new URLSearchParams(window.location.search);
const portalTabBtn = document.getElementById('portalTabBtn');
if (portalTabBtn && urlParams.has('kee')) {
    portalTabBtn.style.display = 'block';
}

const tabs = document.querySelectorAll('.tab-btn');
const contents = document.querySelectorAll('.tab-content');

tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        contents.forEach(c => c.classList.remove('active'));

        tab.classList.add('active');
        const target = document.getElementById(tab.dataset.target);
        if(target) target.classList.add('active');
    });
});

// Force load instantly without waiting for DOM locks
loadAudios();
loadDiary();

const requestForm = document.getElementById('requestForm');
if(requestForm) {
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
}

const adminPass = document.getElementById('adminPass');
const uploadSection = document.getElementById('uploadSection');

if(adminPass) {
    adminPass.addEventListener('input', () => {
        if (adminPass.value.trim() === 'sveta_admin_key') {
            uploadSection.style.display = 'block';
            adminPass.style.display = 'none';
            isAdminUnlocked = true;
            activeAdminPass = adminPass.value.trim();
            const currentFilter = document.querySelector('.filter-pill.active')?.dataset.tag || 'all';
            renderAudios(currentFilter);
            loadDiary(); 
        }
    });
}

const uploadBtn = document.getElementById('uploadBtn');
if(uploadBtn) {
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
                        reject(new Error('Cloudinary error'));
                    }
                };
                xhr.onerror = () => reject(new Error('Network error'));

                const formData = new FormData();
                formData.append('file', file);
                formData.append('upload_preset', 'ml_default');
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

            status.innerText = coverFile ? "Step 2/2: Pushing audio track..." : "Pushing audio track...";
            progressBar.style.width = '0%'; 
            const audioUrl = await pushToCloudinary(audioFile, 'audio');

            status.innerText = "Finalizing archive record...";
            const res = await fetch('/api/upload', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    password: activeAdminPass,
                    title: titleInput.value.trim(),
                    tags: tagsInput.value.trim() || 'untagged',
                    audioUrl: audioUrl,
                    coverUrl: coverUrl
                })
            });

            if (!res.ok) throw new Error('Failed to save to database');

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
}

const postDiaryBtn = document.getElementById('postDiaryBtn');
if(postDiaryBtn) {
    postDiaryBtn.addEventListener('click', async () => {
        const textInput = document.getElementById('diaryInput');
        const status = document.getElementById('diaryStatus');
        
        if (!textInput.value.trim()) {
            status.innerText = "Entry cannot be empty.";
            return;
        }

        status.innerText = "Publishing entry...";

        try {
            const res = await fetch('/api/diary-post', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    password: activeAdminPass,
                    text: textInput.value
                })
            });

            if (!res.ok) throw new Error('Failed to post');
            
            status.innerText = "Published successfully!";
            textInput.value = '';
            loadDiary();
            
            setTimeout(() => { status.innerText = ''; }, 3000);
        } catch (error) {
            status.innerText = "Publish failed.";
        }
    });
}

const editModal = document.getElementById('editModal');
const cancelEditBtn = document.getElementById('cancelEditBtn');
const saveEditBtn = document.getElementById('saveEditBtn');

if(cancelEditBtn) {
    cancelEditBtn.addEventListener('click', () => {
        editModal.style.display = 'none';
    });
}

if(saveEditBtn) {
    saveEditBtn.addEventListener('click', async () => {
        const id = document.getElementById('editId').value;
        const newTitle = document.getElementById('editTitle').value;
        const newTags = document.getElementById('editTags').value;
        const status = document.getElementById('editStatus');

        status.innerText = "Saving changes...";
        try {
            const res = await fetch('/api/edit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: activeAdminPass, id: parseInt(id), title: newTitle, tags: newTags })
            });

            if (!res.ok) throw new Error("Failed to edit");

            editModal.style.display = 'none';
            status.innerText = "";
            loadAudios();
        } catch (error) {
            status.innerText = "Error saving.";
        }
    });
}

async function loadAudios() {
    const container = document.getElementById('audioContainer');
    if(!container) return;
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

async function loadDiary() {
    const container = document.getElementById('diaryContainer');
    if(!container) return;
    try {
        const response = await fetch('/api/diary', { cache: 'no-store' });
        if (response.ok) {
            const entries = await response.json();
            if (entries.length === 0) {
                container.innerHTML = '<p class="loading-text">No diary entries yet.</p>';
                return;
            }
            
            container.innerHTML = entries.map(entry => `
                <div class="diary-entry">
                    <div class="diary-date">${entry.date}</div>
                    <div class="diary-text">${entry.text.replace(/\n/g, '<br>')}</div>
                </div>
            `).join('');
        }
    } catch (error) {
        container.innerHTML = '<p class="loading-text">Unable to load diary.</p>';
    }
}

function renderFilters() {
    const filterBar = document.getElementById('filterBar');
    if (!filterBar) return;
    if (globalAudios.length === 0) { filterBar.innerHTML = ''; return; }

    const tagsSet = new Set();
    globalAudios.forEach(item => {
        item.tags.forEach(t => { if(t.toLowerCase() !== 'untagged') tagsSet.add(t.toLowerCase()); });
    });

    let html = `<button class="filter-pill active" data-tag="all">All</button>`;
    tagsSet.forEach(tag => html += `<button class="filter-pill" data-tag="${tag}">${tag}</button>`);
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
    if(!container) return;
    container.innerHTML = '';
    const filtered = filterTag === 'all' ? globalAudios : globalAudios.filter(a => a.tags.map(t=>t.toLowerCase()).includes(filterTag));

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

        let adminHtml = isAdminUnlocked ? `
            <div class="admin-controls">
                <button class="admin-btn edit-btn" data-id="${audio.id}">Edit</button>
                <button class="admin-btn delete-btn" data-id="${audio.id}">Delete</button>
            </div>
        ` : '';

        div.innerHTML = `
            <div class="audio-header">
                ${coverHtml}
                <div class="audio-info">
                    <div class="audio-title">${audio.title}</div>
                    <div class="audio-tags-container">${tagsHtml}</div>
                    ${adminHtml}
                </div>
            </div>
            <audio controls controlsList="nodownload">
                <source src="${audio.audioUrl}">
            </audio>
        `;
        container.appendChild(div);
    });

    if (isAdminUnlocked) {
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = parseInt(e.target.dataset.id);
                const track = globalAudios.find(a => a.id === id);
                if (track) {
                    document.getElementById('editId').value = track.id;
                    document.getElementById('editTitle').value = track.title;
                    document.getElementById('editTags').value = track.tags.join(', ');
                    document.getElementById('editModal').style.display = 'flex';
                }
            });
        });

        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = parseInt(e.target.dataset.id);
                if (confirm("Remove this track from the archive?")) {
                    e.target.innerText = "Deleting...";
                    try {
                        const res = await fetch('/api/delete', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ password: activeAdminPass, id: id })
                        });
                        if (!res.ok) throw new Error("Delete failed");
                        loadAudios();
                    } catch (error) {
                        e.target.innerText = "Delete";
                    }
                }
            });
        });
    }
}
