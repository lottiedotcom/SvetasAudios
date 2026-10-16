import { put } from '@vercel/blob';
import formidable from 'formidable';
import fs from 'fs';
import path from 'path';

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

    const form = formidable({ multiples: false });
    form.parse(req, async (err, fields, files) => {
        if (err) {
            return res.status(500).json({ error: 'Form parsing error' });
        }
        
        try {
            // Safely handle arrays vs single items (depending on the Vercel node version)
            const fileArray = files.file;
            const file = Array.isArray(fileArray) ? fileArray[0] : fileArray;
            
            const titleArray = fields.title;
            const title = Array.isArray(titleArray) ? titleArray[0] : titleArray;

            if (!file) {
                return res.status(400).json({ error: 'No file uploaded' });
            }

            const fileContent = fs.readFileSync(file.filepath);
            const ext = path.extname(file.originalFilename || '') || '.mp3';
            const filename = `${title}${ext}`;

            const blob = await put(filename, fileContent, {
                access: 'public',
                contentType: file.mimetype || 'audio/mpeg'
            });
            
            return res.status(200).json(blob);
        } catch (error) {
            return res.status(500).json({ error: 'Failed to upload to blob' });
        }
    });
}
