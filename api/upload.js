const { put } = require('@vercel/blob');

// Increase serverless body parsing timeout limit if needed
export const config = {
    api: {
        bodyParser: false, // Allows streaming raw file data directly
    },
};

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const authHeader = req.headers['x-upload-secret'];
    if (authHeader !== process.env.UPLOAD_SECRET) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const filename = req.headers['x-filename'];
    if (!filename) {
        return res.status(400).json({ error: 'Missing filename header' });
    }

    try {
        const blob = await put(filename, req, {
            access: 'public',
            token: process.env.BLOB_READ_WRITE_TOKEN
        });

        return res.status(200).json(blob);
    } catch (error) {
        console.error('Direct put error:', error);
        return res.status(500).json({ error: error.message });
    }
};
