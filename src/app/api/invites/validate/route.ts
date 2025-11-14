import { NextResponse } from 'next/server';
import { db } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';

export async function POST(request: Request) {
  try {
    const { inviteCode } = await request.json();
    if (!inviteCode || typeof inviteCode !== 'string') {
      return NextResponse.json({ ok: false, error: 'inviteCode is required' }, { status: 400 });
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

    return NextResponse.json({ ok: true, invite });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message ?? 'Server error' }, { status: 500 });
  }
}


