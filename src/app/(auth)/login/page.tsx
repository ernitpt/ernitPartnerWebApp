"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/firebase";
import { sendPasswordResetEmail, signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc, enableNetwork } from "firebase/firestore";
import { checkInvite } from "@/services/inviteService";
import type { PartnerUserRecord } from "@/types/partner";

export default function PartnerLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [checkingInvite, setCheckingInvite] = useState(false);
  const router = useRouter();

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);

    try {
      const userCred = await signInWithEmailAndPassword(auth, email, password);
      const uid = userCred.user.uid;

      // 🔧 Your partner user doc is in "partnerUsers", not "partnerUser"
      const partnerSnap = await getDoc(doc(db, "partnerUsers", uid));

      if (!partnerSnap.exists()) {
        alert("This account is not registered as a partner.");
        return;
      }

      const data = partnerSnap.data() as PartnerUserRecord;
      const isPartner = data.userType === "partner";
      const isAdmin = Boolean(data.isAdmin);

      if (!isPartner && !isAdmin) {
        alert("This account is not registered as a partner or admin.");
        return;
      }

      // ✅ Redirect to partner dashboard (or admin if needed)
        router.push("/dashboard" as any);

    } catch (error: any) {
      alert(error.message ?? "Login failed");
    } finally {
      setLoading(false);
    }
    
  };


    const handleReset = async () => {
      if (!email.trim()) {
        alert("Please enter your email first.");
        return;
      }

      setResetting(true);
      try {
        await sendPasswordResetEmail(auth, email.trim());
        alert("✅ Password reset email sent! Please check your inbox and spam folder.");
      } catch (error: any) {
        if (error.code === "auth/user-not-found") {
          alert("No account found with that email.");
        } else if (error.code === "auth/invalid-email") {
          alert("Invalid email format.");
        } else {
          alert("Error sending reset email: " + error.message);
        }
        console.error("Password reset error:", error);
      } finally {
        setResetting(false);
      }
    };


  const handleCheckInvite = async () => {
    if (!inviteCode.trim()) {
      alert("Enter an invite code.");
      return;
    }

    setCheckingInvite(true);
    try {
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        alert("You appear to be offline. Please check your internet connection.");
        return;
      }

      await enableNetwork(db as any);
      await checkInvite(inviteCode);
      router.push(`/signup?invite=${encodeURIComponent(inviteCode.trim())}` as any);
    } catch (err: any) {
      alert("Error checking invite: " + err.message);
    } finally {
      setCheckingInvite(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center animated-gradient">
      <div className="bg-white rounded-3xl shadow-2xl p-10 w-[380px] backdrop-blur-md bg-opacity-95">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-gradient-to-br from-purple-600 to-blue-500 rounded-full w-20 h-20 flex items-center justify-center shadow-lg mb-4 animate-pulse-slow">
            <span className="text-white text-3xl font-bold">E</span>
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900">Ernit Partners</h1>
          <p className="text-gray-800 mt-1 text-center">Access your partner dashboard</p>
        </div>

        <form onSubmit={handleLogin} className="flex flex-col space-y-4">
          <input
            type="email"
            placeholder="Email"
            className="w-full p-3 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition shadow-sm hover:shadow-md"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <input
            type="password"
            placeholder="Password"
            className="w-full p-3 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition shadow-sm hover:shadow-md"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 rounded-xl font-semibold text-white transition-transform duration-300 ${
              loading
                ? "bg-purple-400 cursor-not-allowed"
                : "bg-gradient-to-r from-purple-600 to-blue-500 hover:scale-105 hover:shadow-lg hover:from-purple-500 hover:to-indigo-400"
            }`}
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <div className="mt-4 text-center">
          <button
            type="button"
            className="text-sm text-gray-800 hover:text-purple-700 hover:underline transition"
            onClick={handleReset}
            disabled={resetting}
          >
            {resetting ? "Sending..." : "Forgot your password? Send reset"}
          </button>
        </div>

        <div className="flex items-center my-6">
          <div className="flex-1 h-px bg-gray-300" />
          <span className="px-3 text-gray-500 text-sm">or</span>
          <div className="flex-1 h-px bg-gray-300" />
        </div>

        <div className="text-center space-y-4">
          <p className="text-sm text-gray-800 font-medium">Enter your invite code to sign up:</p>
          <div className="flex flex-col space-y-3">
            <input
              type="text"
              placeholder="Enter invite code"
              className="w-full p-3 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition shadow-sm hover:shadow-md"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
            />
            <button
              onClick={handleCheckInvite}
              disabled={checkingInvite}
              className={`w-full py-3 rounded-xl font-semibold text-white transition-transform duration-300 ${
                checkingInvite
                  ? "bg-purple-400 cursor-not-allowed"
                  : "bg-gradient-to-r from-purple-600 to-blue-500 hover:scale-105 hover:shadow-lg hover:from-purple-500 hover:to-indigo-400"
              }`}
            >
              {checkingInvite ? "Checking..." : "Check Invite"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}



