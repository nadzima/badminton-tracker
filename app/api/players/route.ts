import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/sheets";

export async function GET() {
  try {
    const players = await db.players.list();
    return NextResponse.json(players);
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { name } = await req.json();
    if (!name?.trim()) {
      return NextResponse.json({ error: "Name required" }, { status: 400 });
    }
    const existing = await db.players.findByName(name.trim());
    if (existing) return NextResponse.json(existing);
    const player = await db.players.create(name.trim());
    return NextResponse.json(player, { status: 201 });
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
