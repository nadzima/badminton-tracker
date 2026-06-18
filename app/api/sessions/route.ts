import { NextRequest, NextResponse } from "next/server";
import { appscript } from "@/lib/appscript";

export async function GET() {
  try {
    const sessions = await appscript.get("getSessions");
    return NextResponse.json(sessions);
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = await appscript.post("createSession", body);
    return NextResponse.json(result, { status: 201 });
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
