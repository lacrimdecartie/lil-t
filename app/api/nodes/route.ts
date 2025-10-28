import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const mapId = searchParams.get("mapId");
  if (!mapId) return NextResponse.json({ error: "mapId required" }, { status: 400 });
  const nodes = await prisma.node.findMany({ where: { mapId }, orderBy: { createdAt: "asc" } });
  return NextResponse.json(nodes);
}

export async function POST(req: Request) {
  const body = await req.json();
  const { mapId, label, x = 0, y = 0, color, markdown, width, height, icon } = body;
  if (!mapId || !label) return NextResponse.json({ error: "mapId & label required" }, { status: 400 });
  const node = await prisma.node.create({ data: { mapId, label, x, y, color, markdown, width, height, icon } });
  return NextResponse.json(node, { status: 201 });
}

export async function PUT(req: Request) {
  const body = await req.json();
  const { id, ...data } = body;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const node = await prisma.node.update({ where: { id }, data });
  return NextResponse.json(node);
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  await prisma.node.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
