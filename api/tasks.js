import { Redis } from '@upstash/redis'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

let redis = null;
try {
    // Configura Upstash Redis només si les credencials existeixen
    if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
        redis = new Redis({
            url: process.env.UPSTASH_REDIS_REST_URL,
            token: process.env.UPSTASH_REDIS_REST_TOKEN,
        })
    }
} catch (e) {
    console.log("No hi ha configuració de Redis.");
}

// Fallback local per desenvolupament (grava a disc per evitar que un "git push" o reinici del server esborri l'estat en memòria)
const LOCAL_DB_PATH = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '.local-tasks-db.json');

function loadDefaultTasks() {
    const currentFilePath = fileURLToPath(import.meta.url);
    const jsonPath = path.resolve(path.dirname(currentFilePath), '../src/cims_essencials_feec.json');
    let cims = [];
    try {
        const data = fs.readFileSync(jsonPath, 'utf8');
        cims = JSON.parse(data);
    } catch (e) {
        console.error("Error llegint els cims:", e);
    }

    return [
        {
            id: "repte-100-cims",
            title: "Fer els 100 Cims Essencials de la FEEC amb la Pesseta",
            isDone: false,
            subtasks: cims.length > 0 ? cims : [],
            comments: "",
            images: []
        }
    ];
}

export default async function handler(req, res) {
    // CORS configuration
    res.setHeader('Access-Control-Allow-Credentials', true)
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT')
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    )

    if (req.method === 'OPTIONS') {
        res.status(200).end()
        return
    }

    const userId = req.query.user || 'gerard'; // User isolation just in case

    if (req.method === 'GET') {
        try {
            let tasks = null;
            if (redis) {
                tasks = await redis.get(`tasks_${userId}`);
                if (typeof tasks === 'string') tasks = JSON.parse(tasks);
            } else {
                // Read from local JSON file instead of ephemeral RAM
                try {
                    if (fs.existsSync(LOCAL_DB_PATH)) {
                        tasks = JSON.parse(fs.readFileSync(LOCAL_DB_PATH, 'utf8'));
                    }
                } catch (err) {
                    console.error("Error read db fallback", err);
                }
            }

            // Si la base de dades està buida, retonem el repte per defecte.
            if (!tasks || (Array.isArray(tasks) && tasks.length === 0)) {
                tasks = loadDefaultTasks();
                // Guardem l'estat per defecte
                if (redis) {
                    await redis.set(`tasks_${userId}`, JSON.stringify(tasks));
                } else {
                    fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(tasks, null, 2));
                }
            }

            return res.status(200).json(tasks);
        } catch (error) {
            console.error(error);
            return res.status(500).json({ error: "Error obtenint les tasques" });
        }
    }

    if (req.method === 'POST') {
        try {
            const newTasks = req.body;

            if (redis) {
                await redis.set(`tasks_${userId}`, JSON.stringify(newTasks));
            } else {
                fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(newTasks, null, 2));
            }

            return res.status(200).json({ success: true });
        } catch (error) {
            console.error(error);
            return res.status(500).json({ error: "Error guardant les tasques" });
        }
    }

    res.status(405).json({ error: 'Method not allowed' });
}
