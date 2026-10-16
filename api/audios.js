const { list } = require('@vercel/blob');

module.exports = async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { blobs } = await list({
            token: process.env.BLOB_READ_WRITE_TOKEN
        });
        
        const audios = blobs.map(blob => ({
            title: decodeURIComponent(blob.pathname.split('.')[0]),
            url: blob.url
        }));
        
        // This line strictly blocks Vercel from caching the empty feed
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.status(200).json(audios);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch archive' });
    }
};
