const { put, list } = require('@vercel/blob');

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    try {
        const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

        if (body.password !== process.env.UPLOAD_SECRET) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const { blobs } = await list({ token: process.env.BLOB_READ_WRITE_TOKEN });
        const dbBlob = blobs.find(b => b.pathname === 'sveta_db.json');
        
        if (!dbBlob) return res.status(404).json({ error: 'Database not found' });

        const dbRes = await fetch(dbBlob.url);
        let db = await dbRes.json();

        // Find the specific audio and update its data
        const index = db.findIndex(item => item.id === body.id);
        if (index !== -1) {
            db[index].title = body.title;
            db[index].tags = body.tags.split(',').map(t => t.trim()).filter(t => t);
        }

        await put('sveta_db.json', JSON.stringify(db), {
            access: 'public',
            addRandomSuffix: false,
            token: process.env.BLOB_READ_WRITE_TOKEN
        });

        return res.status(200).json({ success: true });
    } catch (error) {
        return res.status(500).json({ error: 'Failed to edit database: ' + error.message });
    }
};
