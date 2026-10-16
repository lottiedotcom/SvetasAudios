const { handleUpload } = require('@vercel/blob/client');

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: `Method ${req.method} Not Allowed. This endpoint only accepts POST requests.` });
    }

    try {
        const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});

        const jsonResponse = await handleUpload({
            body,
            request: req,
            token: process.env.BLOB_READ_WRITE_TOKEN, // Explicitly forces Vercel to use the database token
            onBeforeGenerateToken: async (pathname, clientPayload) => {
                if (clientPayload !== process.env.UPLOAD_SECRET) {
                    throw new Error('Unauthorized - Check your password');
                }
                return {
                    allowedContentTypes: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'video/mp4', 'audio/mp4', 'audio/x-m4a', 'audio/m4a', 'application/octet-stream'],
                };
            },
            onUploadCompleted: async ({ blob }) => {
                console.log('Upload successfully completed:', blob.url);
            },
        });

        return res.status(200).json(jsonResponse);
    } catch (error) {
        console.error('Upload Error:', error);
        return res.status(400).json({ error: error.message || 'Unknown upload error occurred.' });
    }
};
