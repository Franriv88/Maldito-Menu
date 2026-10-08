// fix-cors.js — aplica cors.json al bucket de Storage (Cloud Storage JSON API)
// Uso: node fix-cors.js

const https = require('https');
const fs    = require('fs');
const path  = require('path');
const os    = require('os');

const PROJECT_ID  = 'maldito-cafe';
const BUCKET_NAME = 'maldito-cafe.firebasestorage.app';
const CONFIG_PATH = path.join(os.homedir(), '.config', 'configstore', 'firebase-tools.json');

const CLIENT_ID     = '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com';
const CLIENT_SECRET = 'j9iVZfS8kkCEFUPaAeJV0sAi';

function req(hostname, urlPath, method, token, body) {
    return new Promise((resolve, reject) => {
        const data = body ? JSON.stringify(body) : null;
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;
        if (data)  headers['Content-Length'] = Buffer.byteLength(data);
        const r = https.request({ hostname, path: urlPath, method, headers }, res => {
            let s = ''; res.on('data', c => s += c);
            res.on('end', () => resolve({ status: res.statusCode, body: s }));
        });
        r.on('error', reject);
        if (data) r.write(data);
        r.end();
    });
}

(async () => {
    // 1. Leer credenciales
    const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    const refreshToken = config?.tokens?.refresh_token;
    if (!refreshToken) { console.error('Corré: npx firebase-tools login'); process.exit(1); }

    // 2. Obtener access token
    const tokenData = `grant_type=refresh_token&refresh_token=${encodeURIComponent(refreshToken)}&client_id=${CLIENT_ID}&client_secret=${CLIENT_SECRET}`;
    const tokenRes = await new Promise((resolve, reject) => {
        const r = https.request(
            { hostname: 'oauth2.googleapis.com', path: '/token', method: 'POST',
              headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(tokenData) } },
            res => { let s = ''; res.on('data', c => s += c); res.on('end', () => resolve(JSON.parse(s))); }
        );
        r.on('error', reject); r.write(tokenData); r.end();
    });

    const token = tokenRes.access_token;
    if (!token) { console.error('Error obteniendo token:', tokenRes); process.exit(1); }
    console.log('Token OK.\n');

    // 3. Aplicar cors.json al bucket (Cloud Storage JSON API) y mostrar cómo quedó.
    //    Permite que cubierto.menu LEA las imágenes de Storage con fetch (ej. "Quitar fondo"
    //    sobre una imagen ya cargada). Las subidas usan la API de Firebase y no dependen de esto.
    const cors = JSON.parse(fs.readFileSync(path.join(__dirname, 'cors.json'), 'utf8'));
    const corsRes = await req('storage.googleapis.com', `/storage/v1/b/${encodeURIComponent(BUCKET_NAME)}?fields=cors`, 'PATCH', token, { cors });
    console.log(`PATCH CORS → ${corsRes.status}`);
    console.log(corsRes.body.slice(0, 600));
    if (corsRes.status !== 200) process.exit(1);
})();
