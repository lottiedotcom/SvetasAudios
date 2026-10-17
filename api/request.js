module.exports = async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    try {
        const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
        const userRequest = body.request?.trim();

        if (!userRequest) {
            return res.status(400).json({ error: 'Request cannot be empty.' });
        }

        const discordUrl = process.env.DISCORD_WEBHOOK_URL;
        if (!discordUrl) {
            return res.status(500).json({ error: 'Discord webhook is not configured.' });
        }

        // Formats the message with a bold header and blockquote styling
        const discordResponse = await fetch(discordUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                content: `🎀 **New Anonymous Archive Request:**\n> ${userRequest.replace(/\n/g, '\n> ')}`
            })
        });

        if (!discordResponse.ok) {
            throw new Error('Failed to deliver message to Discord.');
        }

        return res.status(200).json({ success: true });
    } catch (error) {
        console.error('Webhook Error:', error);
        return res.status(500).json({ error: 'Failed to process request.' });
    }
};
