import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const { label, color, directed, labelX, labelY } = body ?? {};
    const edge = await prisma.edge.update({
      where: { id: params.id },
      data: {
        ...(label !== undefined ? { label: String(label) } : {}),
        ...(color !== undefined ? { color: String(color) } : {}),
        ...(directed !== undefined ? { directed: Boolean(directed) } : {}),
        ...(labelX !== undefined ? { labelX: Number(labelX) } : {}),
        ...(labelY !== undefined ? { labelY: Number(labelY) } : {}),
      },
    });
    return NextResponse.json(edge);
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message ?? e) }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    await prisma.edge.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message ?? e) }, { status: 500 });
  }
}
