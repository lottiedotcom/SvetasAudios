// Remove: import { upload } from 'https://esm.sh/@vercel/blob...';

async function uploadFileDirect(filename, file, secret) {
    const response = await fetch('/api/upload', {
        method: 'POST',
        headers: {
            'x-upload-secret': secret,
            'x-filename': encodeURIComponent(filename),
            'content-type': file.type || 'application/octet-stream'
        },
        body: file
    });

    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Upload failed');
    }

    return await response.json();
}
