import { db } from './db.js';

export function seedIfEmpty() {
  const count = db.prepare('SELECT COUNT(*) c FROM maps').get().c;
  if (count > 0) return;
  const mapId = db.prepare('INSERT INTO maps (name, description, owner_id) VALUES (?,?,?)')
    .run('Beispiel-Map', 'A, B, C + Relationen', 1).lastInsertRowid;
  const nA = db.prepare('INSERT INTO nodes (map_id,label,x,y,description) VALUES (?,?,?,?,?)')
    .run(mapId, 'A', 100, 120, 'Node A').lastInsertRowid;
  const nB = db.prepare('INSERT INTO nodes (map_id,label,x,y,description) VALUES (?,?,?,?,?)')
    .run(mapId, 'B', 400, 100, 'Node B').lastInsertRowid;
  const nC = db.prepare('INSERT INTO nodes (map_id,label,x,y,description) VALUES (?,?,?,?,?)')
    .run(mapId, 'C', 280, 260, 'Node C').lastInsertRowid;
  db.prepare('INSERT INTO edges (map_id,source,target,label,directed) VALUES (?,?,?,?,1)').run(mapId, nA, nB, 'relates');
  db.prepare('INSERT INTO edges (map_id,source,target,label,directed) VALUES (?,?,?,?,1)').run(mapId, nB, nC, 'causes');
}
