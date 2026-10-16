import { handleUpload } from '@vercel/blob/client';

export default async function handler(req, res) {
    try {
        const jsonResponse = await handleUpload({
            body: req.body,
            request: req,
            onBeforeGenerateToken: async (pathname, clientPayload) => {
                // This checks the password securely sent from the frontend
                if (clientPayload !== process.env.UPLOAD_SECRET) {
                    throw new Error('Unauthorized password');
                }
                return {
                    // Broadened to catch all M4A and MP4 variations safely
                    allowedContentTypes: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'video/mp4', 'audio/mp4', 'audio/x-m4a', 'audio/m4a', 'application/octet-stream'],
                };
            },
            onUploadCompleted: async ({ blob }) => {
                // The Vercel Blob database securely pings this when the upload finishes
            },
        });

        return res.status(200).json(jsonResponse);
    } catch (error) {
        return res.status(400).json({ error: error.message });
    }
}
