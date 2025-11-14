import { NextResponse } from 'next/server';
import { db } from '@/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

export async function POST(request: Request) {
  try {
    const { inviteCode, uid } = await request.json();
    if (!inviteCode || typeof inviteCode !== 'string') {
      return NextResponse.json({ ok: false, error: 'inviteCode is required' }, { status: 400 });
    }
    if (!uid || typeof uid !== 'string') {
      return NextResponse.json({ ok: false, error: 'uid is required' }, { status: 400 });
    }

    const ref = doc(db, 'partnerInvites', inviteCode.trim());
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      return NextResponse.json({ ok: false, error: 'Invalid invite code' }, { status: 404 });
    }

    const invite = snap.data();
    if (invite.status !== 'pending') {
      return NextResponse.json({ ok: false, error: 'Invite used or expired' }, { status: 409 });
    }

    await updateDoc(ref, { status: 'used', usedBy: uid, usedAt: Date.now() });
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message ?? 'Server error' }, { status: 500 });
  }
}


