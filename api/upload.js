const { handleUpload } = require('@vercel/blob/client');

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: `Method ${req.method} Not Allowed.` });
    }

    try {
        const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});

        const jsonResponse = await handleUpload({
            body,
            request: req,
            token: process.env.BLOB_READ_WRITE_TOKEN,
            onBeforeGenerateToken: async (pathname, clientPayload) => {
                if (clientPayload !== process.env.UPLOAD_SECRET) {
                    throw new Error('Unauthorized');
                }
                return {
                    // Added image formats so covers can be saved
                    allowedContentTypes: [
                        'audio/mpeg', 'audio/wav', 'audio/ogg', 'video/mp4', 'audio/mp4', 'audio/x-m4a', 'audio/m4a', 'application/octet-stream',
                        'image/jpeg', 'image/png', 'image/gif', 'image/webp'
                    ],
                };
            },
            onUploadCompleted: async ({ blob }) => {
                console.log('Upload saved:', blob.url);
            },
        });

        return res.status(200).json(jsonResponse);
    } catch (error) {
        console.error('Upload Error:', error);
        return res.status(400).json({ error: error.message || 'Unknown error.' });
    }
};
