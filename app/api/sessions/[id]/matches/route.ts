import { NextRequest, NextResponse } from "next/server";
import { appscript } from "@/lib/appscript";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const matches = (body.matches ?? [body]).map((m: Record<string, unknown>) => ({
      ...m,
      session_id: params.id,
    }));
    const result = await appscript.post("addMatches", {
      sessionId: params.id,
      matches,
    });
    return NextResponse.json(result, { status: 201 });
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
