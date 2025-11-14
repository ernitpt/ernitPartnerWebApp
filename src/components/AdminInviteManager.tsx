"use client";

import { useState, useEffect } from "react";
import {
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
} from "firebase/firestore";
import { db } from "../firebase";

import { FieldValue } from "firebase/firestore";

type InviteStatus = "pending" | "used" | "revoked";

type WithFieldValue<T> = {
  [K in keyof T]: T[K] | FieldValue;
};

type InviteRecord = {
  id: string;
  status: "pending" | "used" | "revoked";
  createdAt?: Timestamp | FieldValue;
  createdBy?: string;
  createdByEmail?: string | null;
  usedAt?: Timestamp | FieldValue;
  usedBy?: string;
};


const INVITES_COLLECTION = "partnerInvites";

export default function AdminInviteManager({
  currentUserId,
  currentUserEmail,
}: {
  currentUserId: string;
  currentUserEmail: string | null;
}) {
  const [invites, setInvites] = useState<InviteRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchInvites = async () => {
      try {
        const invitesRef = collection(db, INVITES_COLLECTION);
        const q = query(invitesRef, orderBy("createdAt", "desc"));
        const snapshot = await getDocs(q);
        if (!isMounted) return;

        const results: InviteRecord[] = snapshot.docs.map((docSnap) => {
          const data = docSnap.data() as Omit<InviteRecord, "id">;
          return { id: docSnap.id, ...data };
        });
        setInvites(results);
        setError(null);
      } catch (err: any) {
        if (!isMounted) return;
        setError(err.message ?? "Failed to load invites.");
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchInvites();

    return () => {
      isMounted = false;
    };
  }, []);

    const handleCreateInvite = async () => {
      setCreating(true);
      setError(null);

      try {
        // Generate unique ID for the invite document
        const inviteId =
          typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
            ? crypto.randomUUID()
            : Math.random().toString(36).slice(2, 10);

        const inviteRef = doc(db, INVITES_COLLECTION, inviteId);

        // ✅ This matches your Firestore rules exactly:
        // Allowed fields: status, createdAt, createdBy, createdByEmail
        await setDoc(inviteRef, {
          status: "pending",
          createdAt: serverTimestamp(),
          createdBy: currentUserId,
          createdByEmail: currentUserEmail ?? null,
        });

        // ✅ Copy the invite link for convenience
        const inviteLink = `${window.location.origin}/signup?invite=${inviteId}`;
        let copied = false;
        if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
          try {
            await navigator.clipboard.writeText(inviteLink);
            copied = true;
          } catch {
            copied = false;
          }
        }

        if (!copied) {
          window.prompt("Copy this invite link:", inviteLink);
        } else {
          alert("✅ Invite link copied to clipboard.");
        }

        // ✅ Refresh invite list
        const invitesRef = collection(db, INVITES_COLLECTION);
        const q = query(invitesRef, orderBy("createdAt", "desc"));
        const snapshot = await getDocs(q);
        const results: InviteRecord[] = snapshot.docs.map((docSnap) => {
          const data = docSnap.data() as Omit<InviteRecord, "id">;
          return { id: docSnap.id, ...data };
        });
        setInvites(results);
      } catch (err: any) {
        console.error("Create invite failed:", err);
        setError(err.message ?? "Failed to create invite.");
      } finally {
        setCreating(false);
      }
    };


  const formatTimestamp = (timestamp?: Timestamp | FieldValue) => {
    if (!timestamp) return "--";
    try {
      // Only real Timestamp objects have toDate()
      if (timestamp instanceof Timestamp) {
        return timestamp.toDate().toLocaleString();
      }
      return "--";
    } catch {
      return "--";
    }
  };


  const handleCopy = (inviteId: string) => {
    const link = `${window.location.origin}/signup/${inviteId}`;
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      navigator.clipboard
        .writeText(link)
        .then(() => alert("Invite link copied to clipboard."))
        .catch(() => window.prompt("Copy this invite link", link));
    } else {
      window.prompt("Copy this invite link", link);
    }
  };

  return (
    <section className="mt-12 border-t pt-8">
      <div className="flex items-center justify-between gap-4 mb-4">
        <div>
          <h2 className="text-2xl font-semibold">Invite Links</h2>
          <p className="text-sm text-gray-600">
            Generate invite URLs for new partners. Links copy to your clipboard automatically.
          </p>
        </div>
        <button
          onClick={handleCreateInvite}
          disabled={creating}
          className="bg-purple-600 text-white px-4 py-2 rounded-md disabled:bg-purple-400"
        >
          {creating ? "Creating..." : "Generate Invite"}
        </button>
      </div>

      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

      {loading ? (
        <p className="text-sm text-gray-600">Loading invites...</p>
      ) : invites.length === 0 ? (
        <p className="text-sm text-gray-600">No invites created yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full border border-gray-200 rounded-lg">
            <thead className="bg-gray-100 text-left text-sm text-gray-600">
              <tr>
                <th className="px-4 py-2 font-medium">Invite ID</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Created</th>
                <th className="px-4 py-2 font-medium">Creator</th>
                <th className="px-4 py-2 font-medium">Used</th>
                <th className="px-4 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {invites.map((invite) => (
                <tr key={invite.id} className="border-t border-gray-200">
                  <td className="px-4 py-2 font-mono text-xs">{invite.id}</td>
                  <td className="px-4 py-2 capitalize">{invite.status}</td>
                  <td className="px-4 py-2">{formatTimestamp(invite.createdAt)}</td>
                  <td className="px-4 py-2">
                    {invite.createdByEmail ?? invite.createdBy ?? "--"}
                  </td>
                  <td className="px-4 py-2">{formatTimestamp(invite.usedAt)}</td>
                  <td className="px-4 py-2">
                    <button
                      onClick={() => handleCopy(invite.id)}
                      className="text-indigo-600 hover:underline"
                      disabled={invite.status !== "pending"}
                    >
                      Copy link
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
