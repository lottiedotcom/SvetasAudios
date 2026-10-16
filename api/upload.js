import { put } from '@vercel/blob';
import formidable from 'formidable';
import fs from 'fs';

export const config = {
    api: { bodyParser: false }
};

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const authHeader = req.headers.authorization;
    if (authHeader !== process.env.UPLOAD_SECRET) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const form = formidable({});
    form.parse(req, async (err, fields, files) => {
        if (err) return res.status(500).json({ error: 'Form parsing error' });
        
        const file = files.file[0];
        const title = fields.title[0];
        const fileContent = fs.readFileSync(file.filepath);

        try {
            const blob = await put(`${title}.mp3`, fileContent, {
                access: 'public',
                contentType: file.mimetype
            });
            res.status(200).json(blob);
        } catch (error) {
            res.status(500).json({ error: 'Failed to upload to blob' });
        }
    });
}
