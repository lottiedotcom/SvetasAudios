const { put, list } = require('@vercel/blob');

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    try {
        const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

        if (body.password !== process.env.UPLOAD_SECRET) {
            return res.status(401).json({ error: 'Unauthorized - Incorrect password.' });
        }

        const { blobs } = await list({ token: process.env.BLOB_READ_WRITE_TOKEN });
        const dbBlob = blobs.find(b => b.pathname === 'sveta_db.json');
        
        let db = [];
        if (dbBlob) {
            // Uses downloadUrl to securely read the private file
            const dbRes = await fetch(dbBlob.downloadUrl || dbBlob.url);
            db = await dbRes.json();
        }

        const newEntry = {
            id: Date.now(),
            title: body.title,
            tags: body.tags.split(',').map(t => t.trim()).filter(t => t),
            audioUrl: body.audioUrl,
            coverUrl: body.coverUrl || null
        };
        db.unshift(newEntry);

        await put('sveta_db.json', JSON.stringify(db), {
            access: 'private', // Matches your Vercel store's private setting
            addRandomSuffix: false,
            token: process.env.BLOB_READ_WRITE_TOKEN
        });

        return res.status(200).json({ success: true });
    } catch (error) {
        console.error('Database Error:', error);
        return res.status(500).json({ error: 'Failed to update database: ' + error.message });
    }
};
