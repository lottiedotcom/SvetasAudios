module.exports = async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: `Method ${req.method} Not Allowed.` });
    }

    try {
        const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});

        if (body.password !== process.env.UPLOAD_SECRET) {
            return res.status(401).json({ error: 'Unauthorized - Incorrect passphrase.' });
        }

        // Securely hands the database key to your frontend so it can push natively
        return res.status(200).json({ token: process.env.BLOB_READ_WRITE_TOKEN });
    } catch (error) {
        console.error('Auth Error:', error);
        return res.status(400).json({ error: 'Authentication request failed.' });
    }
};
