import { put } from '@vercel/blob';

export const config = {
    api: {
        bodyParser: false, // Desactivem el parser de Vercel per poder rebre el fitxer en brut as-is
    },
};

export default async function handler(req, res) {
    // CORS configuration
    res.setHeader('Access-Control-Allow-Credentials', true)
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS')

    if (req.method === 'OPTIONS') {
        return res.status(200).end()
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Mètode no permès' });
    }

    try {
        const filename = req.query.filename || 'imatge.png';

        // Utilitzem Vercel Blob per penjar la imatge
        const blob = await put(filename, req, {
            access: 'public',
            token: process.env.BLOB_READ_WRITE_TOKEN,
        });

        return res.status(200).json(blob);
    } catch (error) {
        console.error("Error pujant la imatge a Vercel Blob:", error);
        return res.status(500).json({ error: "S'ha produït un error en intentar pujar el fitxer. Assegura't de tenir Vercel Blob (@vercel/blob) configurat al projecte." });
    }
}
