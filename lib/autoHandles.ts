// @ts-nocheck
import type { ReactFlowInstance } from 'reactflow';

/**
 * Wählt automatisch die besten Seiten (L/R/T/B) für kürzeste Distanz
 * zwischen zwei Knoten (sourceId, targetId).
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

  // Maße robust ermitteln (React Flow 11: width/height; Fallback measured?.width/height)
  const sW = (s as any).width ?? (s as any).measured?.width ?? 0;
  const sH = (s as any).height ?? (s as any).measured?.height ?? 0;
  const tW = (t as any).width ?? (t as any).measured?.width ?? 0;
  const tH = (t as any).height ?? (t as any).measured?.height ?? 0;

  const sX = s.positionAbsolute.x, sY = s.positionAbsolute.y;
  const tX = t.positionAbsolute.x, tY = t.positionAbsolute.y;

  const sPts: Record<string, [number, number]> = {
    L: [sX,        sY + sH/2],
    R: [sX + sW,   sY + sH/2],
    T: [sX + sW/2, sY],
    B: [sX + sW/2, sY + sH],
  };
  const tPts: Record<string, [number, number]> = {
    L: [tX,        tY + tH/2],
    R: [tX + tW,   tY + tH/2],
    T: [tX + tW/2, tY],
    B: [tX + tW/2, tY + tH],
  };

  let best: null | { sKey: keyof typeof sPts; tKey: keyof typeof tPts; d2: number } = null;

  (Object.keys(sPts) as Array<keyof typeof sPts>).forEach((sk) => {
    (Object.keys(tPts) as Array<keyof typeof tPts>).forEach((tk) => {
      const [ax, ay] = sPts[sk];
      const [bx, by] = tPts[tk];
      const dx = ax - bx, dy = ay - by;
      const d2 = dx*dx + dy*dy;
      if (!best || d2 < best.d2) best = { sKey: sk, tKey: tk, d2 };
    });
  });

  if (!best) return {};
  return { sourceHandle: `${best.sKey}-src`, targetHandle: `${best.tKey}-tgt` };
}
