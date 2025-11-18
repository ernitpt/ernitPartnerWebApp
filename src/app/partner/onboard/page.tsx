"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";

export default function PartnerOnboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-gray-900">
          <div className="bg-white p-10 rounded-3xl shadow-2xl w-[380px] text-center">
            <h1 className="text-2xl font-bold mb-4">Loading setup...</h1>
            <p>Hold on while we prepare your onboarding details.</p>
          </div>
        </div>
      }
    >
      <PartnerOnboardContent />
    </Suspense>
  );
}

function PartnerOnboardContent() {
  const search = useSearchParams();
  const uid = search.get("uid");

  const [email, setEmail] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!uid) return alert("Invalid or expired onboarding link.");
    if (!email || !confirmEmail || !password || !confirmPassword)
      return alert("Please fill in all fields.");
    if (email !== confirmEmail) return alert("Emails do not match.");
    if (password !== confirmPassword) return alert("Passwords do not match.");

    setLoading(true);
    try {
      const res = await fetch("/api/partners/complete-onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid, email, password }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);

      alert(
        data.message ||
          "🎉 Welcome aboard! Your partner account has been successfully set up. You can now log in with this email to access your dashboard and manage your coupons."
      );
      setDone(true);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  if (done)
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-900">
        <div className="bg-white p-10 rounded-3xl shadow-2xl w-[380px] text-center">
          <h1 className="text-2xl font-bold mb-4">🎉 Welcome aboard!</h1>
          <p>Your partner account is ready. You can now log in and manage your coupons.</p>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen flex items-center justify-center animated-gradient">
      <div className="bg-white rounded-3xl shadow-2xl p-10 w-[380px] backdrop-blur-md bg-opacity-95">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Complete Partner Setup</h1>
        <p className="text-gray-700 mb-6">
          Set your email and password to activate your partner account.
        </p>

        <div className="space-y-3 mb-4">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="New email"
            className="w-full border border-gray-300 rounded-xl p-3"
          />
          <input
            type="email"
            value={confirmEmail}
            onChange={(e) => setConfirmEmail(e.target.value)}
            placeholder="Confirm new email"
            className="w-full border border-gray-300 rounded-xl p-3"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="New password"
            className="w-full border border-gray-300 rounded-xl p-3"
          />
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm new password"
            className="w-full border border-gray-300 rounded-xl p-3"
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-purple-600 to-blue-500 hover:scale-105 transition-transform duration-300 disabled:opacity-60"
        >
          {loading ? "Saving..." : "Save & Finish"}
        </button>
      </div>
    </div>
  );
}
