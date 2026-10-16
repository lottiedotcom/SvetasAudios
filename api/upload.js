
import { handleUpload } from '@vercel/blob/client';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    // Checks your password from the secure query string
    const secret = req.query.secret;
    if (secret !== process.env.UPLOAD_SECRET) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const jsonResponse = await handleUpload({
            body: req.body,
            request: req,
            onBeforeGenerateToken: async (pathname) => {
                return {
                    // Allows all audio/video formats to prevent blocks
                    allowedContentTypes: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'video/mp4', 'audio/mp4', 'audio/x-m4a', 'application/octet-stream'],
                };
            },
            onUploadCompleted: async ({ blob }) => {
                // Securely logs completion without handling the heavy file
            },
        });

        return res.status(200).json(jsonResponse);
    } catch (error) {
        return res.status(400).json({ error: error.message });
    }
}
