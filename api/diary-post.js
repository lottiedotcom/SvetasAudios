const { put, list } = require('@vercel/blob');

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    try {
        const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

        if (body.password !== process.env.UPLOAD_SECRET) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const { blobs } = await list({ token: process.env.BLOB_READ_WRITE_TOKEN });
        const dbBlob = blobs.find(b => b.pathname === 'sveta_diary.json');
        
        let db = [];
        if (dbBlob) {
            const dbRes = await fetch(dbBlob.url);
            db = await dbRes.json();
        }

        const newEntry = {
            id: Date.now(),
            date: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
            text: body.text.trim()
        };
        db.unshift(newEntry);

        await put('sveta_diary.json', JSON.stringify(db), {
            access: 'public',
            addRandomSuffix: false,
            token: process.env.BLOB_READ_WRITE_TOKEN
        });

        return res.status(200).json({ success: true });
    } catch (error) {
        return res.status(500).json({ error: 'Failed to update diary: ' + error.message });
    }
};
