import { handleUpload } from '@vercel/blob/client';

export default async function handler(req, res) {
    try {
        // Ensures the server can read the newest client library payload
        const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

        const jsonResponse = await handleUpload({
            body,
            request: req,
            onBeforeGenerateToken: async (pathname, clientPayload) => {
                if (clientPayload !== process.env.UPLOAD_SECRET) {
                    throw new Error('Unauthorized');
                }
                return {
                    // Allows all standard audio and video wrappers
                    allowedContentTypes: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'video/mp4', 'audio/mp4', 'audio/x-m4a', 'audio/m4a', 'application/octet-stream'],
                };
            },
            onUploadCompleted: async ({ blob }) => {
                console.log('Upload complete:', blob.url);
            },
        });

        return res.status(200).json(jsonResponse);
    } catch (error) {
        return res.status(400).json({ error: error.message });
    }
}
