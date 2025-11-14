export type InviteRecord = {
  status?: 'pending' | 'used' | 'expired';
  email?: string;
  role?: string;
};

export async function checkInvite(inviteCode: string): Promise<InviteRecord> {
  const trimmed = inviteCode.trim();
  if (!trimmed) throw new Error('Invite code is required');

  const res = await fetch('/api/invites/validate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ inviteCode: trimmed }),
  });
  const json = await res.json();
  if (!res.ok || !json.ok) throw new Error(json.error || 'Invalid invite code.');
  return json.invite as InviteRecord;
}

export async function consumeInvite(inviteCode: string, uid: string): Promise<void> {
  const trimmed = inviteCode.trim();
  const res = await fetch('/api/invites/consume', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ inviteCode: trimmed, uid }),
  });
  const json = await res.json();
  if (!res.ok || !json.ok) throw new Error(json.error || 'Failed to consume invite');
}


