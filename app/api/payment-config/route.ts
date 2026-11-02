import { NextResponse } from "next/server";
import { paymentProvider } from "@/lib/publish";
import { razorpayMode } from "@/lib/razorpay";

// What the payment panel should say: who takes the money, and whether it is practice or real.
// No keys or secrets here, only labels.
export function GET() {
  const provider = paymentProvider();
  return NextResponse.json({ provider, mode: provider === "razorpay" ? razorpayMode() : "test" });
}
