"use client";

import { FormEvent, useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { auth, db } from "@/firebase";
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
} from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc, updateDoc, Timestamp } from "firebase/firestore";

type InviteStatus = "pending" | "used" | "revoked";

type InviteRecord = {
  status: InviteStatus;
  createdBy?: string;
  createdByEmail?: string | null;
  usedBy?: string;
  usedAt?: Timestamp;
};

const INVITES_COLLECTION = "partnerInvites";
const PARTNER_USERS_COLLECTION = "partnerUsers"; // plural

export function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteId = searchParams.get("invite")?.trim() ?? "";

  const [loading, setLoading] = useState(true);
  const [invite, setInvite] = useState<InviteRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [creating, setCreating] = useState(false);

  // Fetch invite on mount
  useEffect(() => {
    if (!inviteId) {
      setError("Invite not found or has expired.");
      setInvite(null);
      setLoading(false);
      return;
    }

    const fetchInvite = async () => {
      try {
        const ref = doc(db, INVITES_COLLECTION, inviteId);
        const snap = await getDoc(ref);

        if (!snap.exists()) {
          setError("Invite not found or has expired.");
          setInvite(null);
        } else {
          const record = snap.data() as InviteRecord;
          if (record.status !== "pending") {
            setError("This invite has already been used or revoked.");
            setInvite(null);
          } else {
            setInvite(record);
            setError(null);
          }
        }
      } catch (err: any) {
        console.error("Invite fetch failed:", err);
        setError(err.message ?? "Failed to load invite.");
        setInvite(null);
      } finally {
        setLoading(false);
      }
    };

    fetchInvite();
  }, [inviteId]);

  // Handle form submit
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!inviteId) return setError("Invalid invite.");
    if (!email || !password || !confirmPassword)
      return setError("Provide email and password.");
    if (password !== confirmPassword)
      return setError("Passwords do not match.");

    setCreating(true);
    setError(null);

    try {
      const inviteRef = doc(db, INVITES_COLLECTION, inviteId);
      const inviteSnap = await getDoc(inviteRef);
      if (!inviteSnap.exists()) throw new Error("Invite no longer exists.");
      const currentInvite = inviteSnap.data() as InviteRecord;
      if (currentInvite.status !== "pending")
        throw new Error("This invite has already been used or revoked.");

      const userCred = await createUserWithEmailAndPassword(auth, email, password);
      const { user } = userCred;

      await setDoc(doc(db, PARTNER_USERS_COLLECTION, user.uid), {
        name: "",
        userType: "partner",
        isAdmin: false,
        createdFromInvite: inviteId,
        createdAt: serverTimestamp(),
        email: user.email ?? email,
        mapsUrl: "",
      });

      await updateDoc(inviteRef, {
        status: "used",
        usedBy: user.uid,
        usedAt: serverTimestamp(),
      });

      await sendEmailVerification(user).catch(() => {});
      alert("✅ Account created successfully! Redirecting to dashboard...");
      router.push("/dashboard" as any);
    } catch (err: any) {
      console.error("Signup failed:", err);
      setError(err.message ?? "Failed to create account.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center animated-gradient">
      <div className="bg-white rounded-3xl shadow-2xl p-10 w-[380px] backdrop-blur-md bg-opacity-95">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-gradient-to-br from-purple-600 to-blue-500 rounded-full w-20 h-20 flex items-center justify-center shadow-lg mb-4 animate-pulse-slow">
            <span className="text-white text-3xl font-bold">E</span>
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900">Partner Sign Up</h1>
          <p className="text-gray-800 mt-1 text-center">Create your Ernit Partner account</p>
        </div>

        {loading ? (
          <p className="text-center text-gray-600">Checking invite...</p>
        ) : invite ? (
          <form onSubmit={handleSubmit} className="flex flex-col space-y-4">
            {error && <p className="text-sm text-red-600">{error}</p>}
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className="w-full p-3 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition shadow-sm hover:shadow-md"
              required
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full p-3 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition shadow-sm hover:shadow-md"
              required
            />
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm password"
              className="w-full p-3 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition shadow-sm hover:shadow-md"
              required
            />
            <button
              type="submit"
              disabled={creating}
              className={`w-full py-3 rounded-xl font-semibold text-white transition-transform duration-300 ${
                creating
                  ? "bg-purple-400 cursor-not-allowed"
                  : "bg-gradient-to-r from-purple-600 to-blue-500 hover:scale-105 hover:shadow-lg hover:from-purple-500 hover:to-indigo-400"
              }`}
            >
              {creating ? "Creating account..." : "Create account"}
            </button>
          </form>
        ) : (
          <p className="text-center text-red-600">{error ?? "Invite invalid"}</p>
        )}
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-gray-600">
          Loading...
        </div>
      }
    >
      <SignupForm />
    </Suspense>
  );
}
