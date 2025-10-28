import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // Ensure default map exists
    const map = await prisma.map.upsert({
      where: { id: "default-map" },
      update: {},
      create: { id: "default-map", name: "Default Map" },
    });

    // Seed only if map is empty
    const cnt = await prisma.node.count({ where: { mapId: map.id } });
    if (cnt === 0) {
      const a = await prisma.node.create({
        data: { mapId: map.id, label: "Start", x: 120, y: 100, color: "#A7F3D0" },
      });
      const b = await prisma.node.create({
        data: { mapId: map.id, label: "Ziel", x: 360, y: 220, color: "#BFDBFE" },
      });
      await prisma.edge.create({
        data: {
          mapId: map.id,
          sourceId: a.id,
          targetId: b.id,
          label: "Relation",
          color: "#60A5FA",
          directed: true,
        },
      });
    }

    return NextResponse.json({ ok: true, seeded: cnt === 0 });
  } catch (e: any) {
    console.error("[/api/health] seed failed:", e);
    return NextResponse.json({ ok: false, error: String(e?.message ?? e) }, { status: 500 });
  }
}
