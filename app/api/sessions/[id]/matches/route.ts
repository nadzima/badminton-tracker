import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/sheets";
import { Match } from "@/lib/types";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const sessionId = params.id;

    // bulk insert
    const matchList: Omit<Match, "id" | "created_at">[] = (body.matches ?? [body]).map(
      (m: Omit<Match, "id" | "created_at">) => ({ ...m, session_id: sessionId })
    );

    const created = [];
    for (const m of matchList) {
      const match = await db.matches.create(m);
      created.push(match);
    }

    return NextResponse.json(
      matchList.length === 1 ? created[0] : { count: created.length },
      { status: 201 }
    );
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
