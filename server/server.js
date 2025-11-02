import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { db, migrate } from './db.js';
import { authRequired, ensureAdminUser, signToken, verifyUser } from './auth.js';
import { seedIfEmpty } from './seed.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const APP_PORT = Number(process.env.APP_PORT || 39093);
const UPLOAD_DIR = process.env.UPLOAD_DIR || '/data/uploads';
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const upload = multer({ dest: UPLOAD_DIR });

const app = express();
app.use(helmet({contentSecurityPolicy:false,crossOriginEmbedderPolicy:false,crossOriginOpenerPolicy:false,crossOriginResourcePolicy:false}));
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// --- DB & Admin ---
await migrate();
await ensureAdminUser(process.env.ADMIN_USER || 'admin', process.env.ADMIN_PASS || 'admin');
await seedIfEmpty();

// --- Health (DB) ---
const startedAt = Date.now();
app.get('/healthz', (_req, res) => {
  try {
    db.prepare('SELECT 1').get();
    res.json({ ok: true, uptime_s: Math.floor((Date.now() - startedAt)/1000) });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// --- Debug & Diagnose: MÜSSEN vor Static liegen ---
app.get('/healthz/static', (req, res) => {
  try {
    const CLIENT_DIR = path.join(process.cwd(), 'client', 'dist');
    const indexPath = path.join(CLIENT_DIR, 'index.html');
    if (!fs.existsSync(indexPath)) return res.status(500).json({ ok:false, error:'index.html missing' });
    const html = fs.readFileSync(indexPath,'utf8');
    const m = html.match(/src="(\/assets\/[^"']+\.js)"/);
    const asset = m ? m[1] : null;
    res.json({ ok:true, index_bytes: fs.statSync(indexPath).size, asset, client_dir: CLIENT_DIR });
  } catch(e){ res.status(500).json({ ok:false, error:String(e) }); }
});

app.get('/__debug', (_req,res)=>{
  try{
    const CLIENT_DIR = path.join(process.cwd(), 'client', 'dist');
    const list = fs.existsSync(CLIENT_DIR) ? fs.readdirSync(CLIENT_DIR) : [];
    res.json({ dir: CLIENT_DIR, list, env: { APP_PORT: process.env.APP_PORT }, now: Date.now() });
  }catch(e){ res.status(500).json({ error:String(e) })}
});

// Fallback Login-Form (plain)
app.get('/login-plain', (_req,res)=>{
  res.setHeader('Content-Type','text/html; charset=utf-8');
  res.end(`<!doctype html>
  <html><head><meta charset="utf-8"><title>Plain Login</title>
  <style>body{font-family:system-ui;background:#0b1020;color:#e8ecf1;display:grid;place-items:center;height:100vh}
  .card{background:#11182e;padding:16px;border-radius:12px;min-width:320px}</style></head>
  <body><div class="card">
  <h3>Plain Login</h3>
  <input id="u" placeholder="username" value="admin" style="width:100%;padding:8px"><br><br>
  <input id="p" type="password" placeholder="password" value="admin" style="width:100%;padding:8px"><br><br>
  <button onclick="login()">Login</button>
  <pre id="out"></pre>
  <script>
  async function login(){
    const r = await fetch('/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:document.getElementById('u').value,password:document.getElementById('p').value})});
    document.getElementById('out').textContent = await r.text();
  }
  </script></div></body></html>`);
});

// --- Auth ---
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: 'username & password required' });
  const user = await verifyUser(username, password);
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  const token = signToken(user);
  res.json({ token, username: user.username });
});

// --- Maps CRUD ---
app.get('/api/maps', authRequired, (_req, res) => {
  const list = db.prepare('SELECT * FROM maps ORDER BY id DESC').all();
  res.json(list);
});

app.post('/api/maps', authRequired, (req, res) => {
  const { name, description } = req.body || {};
  if (!name) return res.status(400).json({ error: 'name required' });
  const info = db.prepare('INSERT INTO maps (name, description, owner_id) VALUES (?, ?, ?)').run(name, description || '', req.user.uid);
  res.json({ id: info.lastInsertRowid });
});

app.get('/api/maps/:id', authRequired, (req, res) => {
  const id = Number(req.params.id);
  const map = db.prepare('SELECT * FROM maps WHERE id = ?').get(id);
  if (!map) return res.status(404).json({ error: 'Not found' });
  const nodes = db.prepare('SELECT * FROM nodes WHERE map_id = ?').all(id);
  const edges = db.prepare('SELECT * FROM edges WHERE map_id = ?').all(id);
  res.json({ map, nodes, edges });
});

app.put('/api/maps/:id', authRequired, (req, res) => {
  const id = Number(req.params.id);
  const { name, description } = req.body || {};
  const old = db.prepare('SELECT * FROM maps WHERE id = ?').get(id);
  if (!old) return res.status(404).json({ error: 'Not found' });
  db.prepare('UPDATE maps SET name = ?, description = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .run(name || old.name, description ?? old.description, id);
  res.json({ ok: true });
});

app.delete('/api/maps/:id', authRequired, (req, res) => {
  const id = Number(req.params.id);
  db.prepare('DELETE FROM edges WHERE map_id = ?').run(id);
  db.prepare('DELETE FROM nodes WHERE map_id = ?').run(id);
  db.prepare('DELETE FROM maps WHERE id = ?').run(id);
  res.json({ ok: true });
});

// --- Nodes CRUD ---
app.post('/api/maps/:id/nodes', authRequired, (req, res) => {
  const map_id = Number(req.params.id);
  const { label, x, y } = req.body || {};
  const info = db.prepare('INSERT INTO nodes (map_id, label, x, y) VALUES (?, ?, ?, ?)').run(map_id, label || 'New Node', x ?? 0, y ?? 0);
  res.json(db.prepare('SELECT * FROM nodes WHERE id = ?').get(info.lastInsertRowid));
});

app.put('/api/maps/:id/nodes/:nid', authRequired, (req, res) => {
  const { id, nid } = req.params;
  const n = db.prepare('SELECT * FROM nodes WHERE id = ? AND map_id = ?').get(nid, id);
  if (!n) return res.status(404).json({ error: 'Not found' });
  const { label, x, y, description, image_path } = req.body || {};
  db.prepare(`
    UPDATE nodes SET
      label = COALESCE(?, label),
      x = COALESCE(?, x),
      y = COALESCE(?, y),
      description = COALESCE(?, description),
      image_path = COALESCE(?, image_path),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?`)
    .run(label, x, y, description, image_path, nid);
  res.json(db.prepare('SELECT * FROM nodes WHERE id = ?').get(nid));
});

app.delete('/api/maps/:id/nodes/:nid', authRequired, (req, res) => {
  const { id, nid } = req.params;
  db.prepare('DELETE FROM edges WHERE (source = ? OR target = ?) AND map_id = ?').run(nid, nid, id);
  db.prepare('DELETE FROM nodes WHERE id = ? AND map_id = ?').run(nid, id);
  res.json({ ok: true });
});

// --- Edges CRUD ---
app.post('/api/maps/:id/edges', authRequired, (req, res) => {
  const map_id = Number(req.params.id);
  const { source, target, label, directed } = req.body || {};
  const info = db.prepare('INSERT INTO edges (map_id, source, target, label, directed) VALUES (?, ?, ?, ?, ?)').run(map_id, source, target, label || '', directed ? 1 : 0);
  res.json(db.prepare('SELECT * FROM edges WHERE id = ?').get(info.lastInsertRowid));
});

app.put('/api/maps/:id/edges/:eid', authRequired, (req, res) => {
  const { id, eid } = req.params;
  const e = db.prepare('SELECT * FROM edges WHERE id = ? AND map_id = ?').get(eid, id);
  if (!e) return res.status(404).json({ error: 'Not found' });
  const { label, directed, source, target } = req.body || {};
  db.prepare(`
    UPDATE edges SET
      label = COALESCE(?, label),
      directed = COALESCE(?, directed),
      source = COALESCE(?, source),
      target = COALESCE(?, target),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?`)
    .run(label, directed, source, target, eid);
  res.json(db.prepare('SELECT * FROM edges WHERE id = ?').get(eid));
});

app.delete('/api/maps/:id/edges/:eid', authRequired, (req, res) => {
  const { id, eid } = req.params;
  db.prepare('DELETE FROM edges WHERE id = ? AND map_id = ?').run(eid, id);
  res.json({ ok: true });
});

// --- Uploads (Images) ---
app.post('/api/upload', authRequired, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file' });
  res.json({ path: `/uploads/${path.basename(req.file.path)}` });
});
app.use('/uploads', express.static(UPLOAD_DIR));

// --- CSV Export/Import ---
function mapToCSV(map_id) {
  const nodes = db.prepare('SELECT id,label,x,y,description,image_path FROM nodes WHERE map_id = ?').all(map_id);
  const edges = db.prepare('SELECT id,source,target,label,directed FROM edges WHERE map_id = ?').all(map_id);
  const headerN = 'type,id,label,x,y,description,image_path';
  const headerE = 'type,id,source,target,label,directed';
  const rows = [];
  rows.push(headerN);
  for (const n of nodes) rows.push(['node', n.id, escapeCsv(n.label), n.x, n.y, escapeCsv(n.description||''), escapeCsv(n.image_path||'')].join(','));
  rows.push(headerE);
  for (const e of edges) rows.push(['edge', e.id, e.source, e.target, escapeCsv(e.label||''), e.directed].join(','));
  return rows.join('\n');
}
function escapeCsv(s) {
  const str = String(s).replace(/"/g,'""');
  return /[",\n]/.test(str) ? `"${str}"` : str;
}
app.get('/api/maps/:id/csv/export', authRequired, (req, res) => {
  const id = Number(req.params.id);
  const csv = mapToCSV(id);
  res.setHeader('Content-Type','text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="map_${id}.csv"`);
  res.send(csv);
});

app.post('/api/maps/:id/csv/import', authRequired, express.text({ type: '*/*' }), (req,res) => {
  const id = Number(req.params.id);
  const lines = (req.body || '').split(/\r?\n/).filter(Boolean);
  for (const line of lines) {
    if (line.startsWith('type,')) continue;
    const parts = parseCsv(line);
    if (parts[0] === 'node') {
      const [, , label, x, y, description, image_path] = parts;
      db.prepare('INSERT INTO nodes (map_id,label,x,y,description,image_path) VALUES (?,?,?,?,?,?)')
        .run(id, label||'Node', Number(x)||0, Number(y)||0, description||'', image_path||'');
    } else if (parts[0] === 'edge') {
      const [, , source, target, label, directed] = parts;
      db.prepare('INSERT INTO edges (map_id,source,target,label,directed) VALUES (?,?,?,?,?)')
        .run(id, Number(source), Number(target), label||'', Number(directed)?1:0);
    }
  }
  res.json({ ok: true });
});
function parseCsv(line) {
  const out = [];
  let cur = '', inQ = false;
  for (let i=0;i<line.length;i++){
    const c=line[i];
    if (inQ){
      if (c === '"' && line[i+1] === '"'){ cur+='"'; i++; }
      else if (c === '"'){ inQ=false; }
      else cur+=c;
    } else {
      if (c === ','){ out.push(cur); cur=''; }
      else if (c === '"'){ inQ=true; }
      else cur+=c;
    }
  }
  out.push(cur);
  return out;
}

// --- Sharing (Read-only) ---
app.post('/api/maps/:id/share', authRequired, (req,res) => {
  const id = Number(req.params.id);
  const token = crypto.randomBytes(8).toString('hex');
  const { expires_at } = req.body || {};
  db.prepare('INSERT INTO share_tokens (map_id, token, expires_at) VALUES (?,?,?)').run(id, token, expires_at || null);
  res.json({ token, url: `/share/${token}` });
});

app.get('/share/:token', (req,res) => {
  const t = req.params.token;
  const row = db.prepare('SELECT * FROM share_tokens WHERE token = ?').get(t);
  if (!row) return res.status(404).json({ error: 'Invalid token' });
  if (row.expires_at && Date.now() > Date.parse(row.expires_at)) return res.status(410).json({ error: 'Expired' });
  const map = db.prepare('SELECT * FROM maps WHERE id = ?').get(row.map_id);
  const nodes = db.prepare('SELECT * FROM nodes WHERE map_id = ?').all(row.map_id);
  const edges = db.prepare('SELECT * FROM edges WHERE map_id = ?').all(row.map_id);
  res.json({ readOnly: true, map, nodes, edges });
});

// --- Static Frontend (MUSS GANZ ZUM SCHLUSS STEHEN) ---
const CLIENT_DIR = path.join(process.cwd(), 'client', 'dist');
if (fs.existsSync(CLIENT_DIR)) {
  app.use(express.static(CLIENT_DIR));
  app.get('*', (_req,res) => res.sendFile(path.join(CLIENT_DIR, 'index.html')));
}

app.listen(APP_PORT, () => {
  console.log(`Server listening on :${APP_PORT}`);
});
// __PING_OK__
app.get('/api/ping', (_req,res)=>res.json({ok:true, t: Date.now()}));
// __LOGIN_SELFTEST__
app.get('/api/auth/login-selftest', async (_req,res)=>{
  try{
    const user = await verifyUser(process.env.ADMIN_USER || 'admin', process.env.ADMIN_PASS || 'admin');
    if(!user) return res.status(401).json({ok:false, error:'admin creds invalid'});
    return res.json({ok:true});
  }catch(e){ return res.status(500).json({ok:false, error:String(e)}); }
});

/*__EDGE_HANDLES_PERSISTENCE__*/
app.locals.__edgeHandleFileInited = false;
app.locals.__edgeHandlePath = null;
async function __getEdgeHandlePath(){
  if (app.locals.__edgeHandleFileInited) return app.locals.__edgeHandlePath;
  const fs = await import('fs'); const path = await import('path');
  const dataDir = process.env.DATA_DIR || '/data';
  const p = path.join(dataDir, 'edge-handles.json');
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive:true });
  if (!fs.existsSync(p)) fs.writeFileSync(p, JSON.stringify({}, null, 2));
  app.locals.__edgeHandleFileInited = true;
  app.locals.__edgeHandlePath = p;
  return p;
}
async function __readHandles(){
  const fs = await import('fs');
  const p = await __getEdgeHandlePath();
  try { return JSON.parse(fs.readFileSync(p, 'utf8')||'{}'); } catch { return {}; }
}
async function __writeHandles(obj){
  const fs = await import('fs');
  const p = await __getEdgeHandlePath();
  fs.writeFileSync(p, JSON.stringify(obj, null, 2));
}

// Liefert Mapping aller Edge-Handles einer Map (Edge-IDs sind global eindeutig)
app.get('/api/maps/:id/edge-handles', async (req, res)=>{
  try{
    const all = await __readHandles();
    res.json(all);
  }catch(e){ res.status(500).json({error:String(e)}) }
});

// Setzt Handles für eine Edge
app.put('/api/maps/:id/edges/:edgeId/handles', express.json(), async (req,res)=>{
  try{
    const edgeId = String(req.params.edgeId);
    const { sourceHandle, targetHandle } = req.body || {};
    const all = await __readHandles();
    all[edgeId] = { sourceHandle: sourceHandle || null, targetHandle: targetHandle || null };
    await __writeHandles(all);
    res.json({ ok:true, id: edgeId, sourceHandle: all[edgeId].sourceHandle, targetHandle: all[edgeId].targetHandle });
  }catch(e){ res.status(500).json({error:String(e)}) }
});
