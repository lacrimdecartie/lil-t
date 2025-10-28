// @ts-nocheck
import type { ReactFlowInstance } from 'reactflow';

/**
 * Wählt automatisch die besten Seiten (L/R/T/B) für kürzeste Distanz.
 */
export function pickAutoHandles(
  rf: ReactFlowInstance,
  sourceId?: string | null,
  targetId?: string | null
) {
  if (!sourceId || !targetId) return {};
  const s = rf.getNode(sourceId);
  const t = rf.getNode(targetId);
  if (!s || !t || !s.positionAbsolute || !t.positionAbsolute) return {};

  const sW = s.width ?? s.measured?.width ?? 0;
  const sH = s.height ?? s.measured?.height ?? 0;
  const tW = t.width ?? t.measured?.width ?? 0;
  const tH = t.height ?? t.measured?.height ?? 0;

  const sX = s.positionAbsolute.x, sY = s.positionAbsolute.y;
  const tX = t.positionAbsolute.x, tY = t.positionAbsolute.y;

  const sPts = {
    L: [sX,        sY + sH/2],
    R: [sX + sW,   sY + sH/2],
    T: [sX + sW/2, sY],
    B: [sX + sW/2, sY + sH],
  };
  const tPts = {
    L: [tX,        tY + tH/2],
    R: [tX + tW,   tY + tH/2],
    T: [tX + tW/2, tY],
    B: [tX + tW/2, tY + tH],
  };

  let best = null as null | { sKey: keyof typeof sPts; tKey: keyof typeof tPts; d2: number };

  (Object.keys(sPts) as Array<keyof typeof sPts>).forEach(sk => {
    (Object.keys(tPts) as Array<keyof typeof tPts>).forEach(tk => {
      const [ax, ay] = sPts[sk]; const [bx, by] = tPts[tk];
      const dx = ax - bx, dy = ay - by;
      const d2 = dx*dx + dy*dy;
      if (!best || d2 < best.d2) best = { sKey: sk, tKey: tk, d2 };
    });
  });

  if (!best) return {};
  return { sourceHandle: `${best.sKey}-src`, targetHandle: `${best.tKey}-tgt` };
}
