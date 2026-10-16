const { list } = require('@vercel/blob');

module.exports = async function handler(req, res) {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method Not Allowed' });

    try {
        const { blobs } = await list({ token: process.env.BLOB_READ_WRITE_TOKEN });
        const dbBlob = blobs.find(b => b.pathname === 'sveta_db.json');
        
        if (!dbBlob) {
            return res.status(200).json([]); // Archive is currently empty
        }

        // Uses downloadUrl to securely read the private file
        const dbRes = await fetch(dbBlob.downloadUrl || dbBlob.url);
        const db = await dbRes.json();
        
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        return res.status(200).json(db);
    } catch (error) {
        return res.status(500).json({ error: 'Failed to fetch archive' });
    }
};
