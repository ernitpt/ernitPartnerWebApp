import { NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebaseAdmin";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    if (!email) throw new Error("Email is required");

    let userRecord;

    // Try to get user by email; if not found, create placeholder
    try {
      userRecord = await adminAuth.getUserByEmail(email);
    } catch {
      userRecord = await adminAuth.createUser({
        email,
        password: Math.random().toString(36).slice(-8),
        displayName: "New Partner",
      });
    }

    // Generate onboarding link to your app page
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://ernit.xyz";
    const link = `${baseUrl}/partner/onboard?uid=${userRecord.uid}`;

    return NextResponse.json({ ok: true, uid: userRecord.uid, link });
  } catch (e: any) {
    console.error("Onboard error:", e);
    return NextResponse.json({ ok: false, error: e.message }, { status: 400 });
  }
}
