import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";

export async function POST(req: Request) {
  try {
    const { uid, email, password } = await req.json();
    if (!uid || !email || !password) throw new Error("Missing fields");

    // Update the placeholder Firebase Auth user
    const userRecord = await adminAuth.updateUser(uid, {
      email,
      password,
      emailVerified: false,
    });

    // Update Firestore record
    await adminDb.doc(`partnerUsers/${uid}`).set(
      {
        email,
        updatedAt: new Date(),
      },
      { merge: true }
    );

    // Optional: send verification email
    const verifyLink = await adminAuth.generateEmailVerificationLink(email);

    return NextResponse.json({ ok: true, verifyLink });
  } catch (e: any) {
    console.error("Complete onboarding error:", e);
    return NextResponse.json({ ok: false, error: e.message }, { status: 400 });
  }
}
