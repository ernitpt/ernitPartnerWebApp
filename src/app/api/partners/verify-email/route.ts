import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(req: Request) {
  try {
    const { uid, email, password } = await req.json();
    if (!uid || !email || !password) throw new Error("Missing required fields");

    // 1. Verify the user exists
    const existingUser = await adminAuth.getUser(uid);
    const originalEmail = existingUser.email;

    // 2. Validate email is not already in use (unless it's the same email)
    if (email !== originalEmail) {
      try {
        await adminAuth.getUserByEmail(email);
        throw new Error("This email is already registered with another account.");
      } catch (error: any) {
        if (error.code !== 'auth/user-not-found') {
          throw error;
        }
      }
    }

    // 3. Update Firebase Auth
    await adminAuth.updateUser(uid, {
      email,
      password,
      emailVerified: false, // Force verification
    });

    // 4. Create/update Firestore record with complete partner data
    await adminDb.doc(`partnerUsers/${uid}`).set(
      {
        email,
        userType: "partner",
        isAdmin: false,
        name: email.split('@')[0], // Default name from email
        onboardedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        status: "pending_verification", // Mark as pending until email verified
        emailVerified: false,
      },
      { merge: true }
    );

    // 5. Generate and send email verification link
    let verifyLink = null;
    try {
      verifyLink = await adminAuth.generateEmailVerificationLink(email, {
        url: `${process.env.NEXT_PUBLIC_BASE_URL || "https://ernit.xyz"}/login`, // Redirect to login after verification
      });
      
      // TODO: Send this link via your email service (SendGrid, etc.)
      // For now, we'll return it in the response
      
    } catch (verifyError) {
      console.warn("Could not generate verification link:", verifyError);
    }

    return NextResponse.json({ 
      ok: true, 
      message: `Account created for ${email}! Please check your email to verify your account before logging in.`,
      verifyLink, // Remove this in production, send via email instead
      emailChanged: email !== originalEmail,
      requiresVerification: true
    });
  } catch (e: any) {
    console.error("Complete onboarding error:", e);
    return NextResponse.json({ 
      ok: false, 
      error: e.message || "Failed to complete onboarding"
    }, { status: 400 });
  }
}