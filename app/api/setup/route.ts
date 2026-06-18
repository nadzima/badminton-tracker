import { NextResponse } from "next/server";
import { appscript } from "@/lib/appscript";

export async function GET() {
  try {
    const result = await appscript.post("setup");
    return NextResponse.json(result);
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
