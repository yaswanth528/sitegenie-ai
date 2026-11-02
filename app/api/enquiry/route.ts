import { after, NextResponse } from "next/server";
import { sendEmail } from "@/lib/email";
import { limit } from "@/lib/ratelimit";
import { newId, saveEnquiry } from "@/lib/store";

const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

// Someone wants a custom website and asked us to call. We keep their number for the admin
// page, and email it to SUPPORT_EMAIL when email alerts are set up.
export async function POST(req: Request) {
  const stop = await limit(req, "enquiry");
  if (stop) return stop;
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const phone = str(body.phone, 20);
  const name = str(body.name, 80);
  const note = str(body.note, 500);
  const from = str(body.from, 40);
  if (phone.replace(/\D/g, "").length < 10) return NextResponse.json({ error: "Add a phone number we can call (10 digits)." }, { status: 400 });
  const enquiry = { id: newId(), createdAt: new Date().toISOString(), phone, name, note, from };
  try {
    await saveEnquiry(enquiry);
  } catch (err) {
    console.error("Enquiry not saved:", err);
    return NextResponse.json({ error: "Couldn't send that. Please try again in a minute." }, { status: 502 });
  }
  after(() =>
    sendEmail(process.env.SUPPORT_EMAIL, "Custom website enquiry", [`Phone: ${phone}`, name ? `Name: ${name}` : "", note ? `Needs: ${note}` : ""].filter(Boolean)),
  );
  return NextResponse.json({ ok: true });
}
