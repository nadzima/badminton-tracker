import { NextRequest, NextResponse } from "next/server";
import { appscript } from "@/lib/appscript";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const result = await appscript.post("updateMatch", { id: params.id, ...body });
    return NextResponse.json(result);
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const result = await appscript.post("deleteMatch", { id: params.id });
    return NextResponse.json(result);
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
