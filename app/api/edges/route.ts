import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const mapId = searchParams.get("mapId");
  if (!mapId) return NextResponse.json({ error: "mapId required" }, { status: 400 });
  const edges = await prisma.edge.findMany({ where: { mapId }, orderBy: { createdAt: "asc" } });
  return NextResponse.json(edges);
}

export async function POST(req: Request) {
  const body = await req.json();
  const { mapId, sourceId, targetId, label, color, style, directed = true } = body;
  if (!mapId || !sourceId || !targetId) return NextResponse.json({ error: "mapId, sourceId, targetId required" }, { status: 400 });
  const edge = await prisma.edge.create({ data: { mapId, sourceId, targetId, label, color, style, directed } });
  return NextResponse.json(edge, { status: 201 });
}

export async function PUT(req: Request) {
  const body = await req.json();
  const { id, ...data } = body;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const edge = await prisma.edge.update({ where: { id }, data });
  return NextResponse.json(edge);
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  await prisma.edge.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
