import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const { label, color, x, y, width, height } = body ?? {};
    const node = await prisma.node.update({
      where: { id: params.id },
      data: {
        ...(label !== undefined ? { label: String(label) } : {}),
        ...(color !== undefined ? { color: String(color) } : {}),
        ...(x !== undefined ? { x: Number(x) } : {}),
        ...(y !== undefined ? { y: Number(y) } : {}),
        ...(width !== undefined ? { width: Number(width) } : {}),
        ...(height !== undefined ? { height: Number(height) } : {}),
      },
    });
    return NextResponse.json(node);
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message ?? e) }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    // Kanten, die an diesem Node hängen, mit löschen
    await prisma.edge.deleteMany({ where: { OR: [{ sourceId: params.id }, { targetId: params.id }] } });
    await prisma.node.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message ?? e) }, { status: 500 });
  }
}
