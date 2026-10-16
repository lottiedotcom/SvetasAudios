const { list } = require('@vercel/blob');

module.exports = async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { blobs } = await list({
            token: process.env.BLOB_READ_WRITE_TOKEN
        });
        
        const itemsMap = {};

        blobs.forEach(blob => {
            const parts = blob.pathname.split('__');
            if (parts.length >= 4) {
                const type = parts[0]; 
                const id = parts[1];
                const tagsStr = decodeURIComponent(parts[2]);
                const titleWithExt = parts[3];
                const extIndex = titleWithExt.lastIndexOf('.');
                const title = decodeURIComponent(titleWithExt.substring(0, extIndex !== -1 ? extIndex : titleWithExt.length));
                
                if (!itemsMap[id]) {
                    itemsMap[id] = {
                        id,
                        title,
                        tags: tagsStr.split(',').map(t => t.trim()).filter(t => t),
                        audioUrl: '',
                        coverUrl: ''
                    };
                }
                
                if (type === 'audio') itemsMap[id].audioUrl = blob.url;
                if (type === 'cover') itemsMap[id].coverUrl = blob.url;
            }
        });

        const audios = Object.values(itemsMap).filter(item => item.audioUrl).sort((a, b) => b.id - a.id);
        
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.status(200).json(audios);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch archive' });
    }
};
