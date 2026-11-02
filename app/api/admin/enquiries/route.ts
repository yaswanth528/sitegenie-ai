import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { deleteEnquiry, listEnquiries } from "@/lib/store";

const forbidden = () => NextResponse.json({ error: "Please log in." }, { status: 401 });

export async function GET(req: Request) {
  if (!isAdmin(req)) return forbidden();
  return NextResponse.json({ enquiries: await listEnquiries().catch(() => []) });
}

// Mark an enquiry as done by removing it.
export async function DELETE(req: Request) {
  if (!isAdmin(req)) return forbidden();
  await deleteEnquiry(new URL(req.url).searchParams.get("id") ?? "");
  return NextResponse.json({ ok: true });
}
