import { list } from '@vercel/blob';

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { blobs } = await list();
        const audios = blobs.map(blob => ({
            title: decodeURIComponent(blob.pathname.split('.')[0]),
            url: blob.url
        }));
        res.status(200).json(audios);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch archive' });
    }
}
