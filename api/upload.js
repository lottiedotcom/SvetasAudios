import { handleUpload } from '@vercel/blob/client';

export default async function handler(req, res) {
    // 1. Immediately block any accidental GET requests to prevent crashes
    if (req.method !== 'POST') {
        return res.status(405).json({ error: `Method ${req.method} Not Allowed. This endpoint only accepts POST requests.` });
    }

    try {
        // 2. Safely parse the body, providing a fallback empty object if it's missing
        const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});

        const jsonResponse = await handleUpload({
            body,
            request: req,
            onBeforeGenerateToken: async (pathname, clientPayload) => {
                if (clientPayload !== process.env.UPLOAD_SECRET) {
                    throw new Error('Unauthorized - Check your password');
                }
                return {
                    // 3. Keep the broad extensions for M4A and MP3 files
                    allowedContentTypes: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'video/mp4', 'audio/mp4', 'audio/x-m4a', 'audio/m4a', 'application/octet-stream'],
                };
            },
            onUploadCompleted: async ({ blob }) => {
                console.log('Upload successfully completed:', blob.url);
            },
        });

        return res.status(200).json(jsonResponse);
    } catch (error) {
        // 4. Safely catch internal library errors so the function doesn't fail invocation
        console.error('Upload Error:', error);
        return res.status(400).json({ error: error.message || 'Unknown upload error occurred.' });
    }
}
