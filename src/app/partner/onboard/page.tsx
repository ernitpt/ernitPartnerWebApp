"use client";

import { Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

export default function PartnerOnboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-gray-900">
          <div className="bg-white p-10 rounded-3xl shadow-2xl w-[380px] text-center">
            <h1 className="text-2xl font-bold mb-4 text-black">Loading setup...</h1>
            <p className="text-black">Hold on while we prepare your onboarding details.</p>
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
  const router = useRouter();
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

      // Show different message based on whether verification is required
      if (data.requiresVerification) {
        alert(
          `✅ Account created successfully!\n\n📧 We've sent a verification email to ${email}.\n\nPlease check your inbox (and spam folder) and click the verification link before logging in.`
        );
      } else {
        alert(
          data.message ||
            "🎉 Welcome aboard! Your partner account has been successfully set up."
        );
      }
      setDone(true);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoToLogin = () => {
    router.push("/login");
  };

  if (done)
    return (
      <div className="min-h-screen flex items-center justify-center animated-gradient">
        <div className="bg-white p-10 rounded-3xl shadow-2xl w-[380px] text-center backdrop-blur-md bg-opacity-95">
          <div className="bg-gradient-to-br from-purple-600 to-blue-500 rounded-full w-20 h-20 flex items-center justify-center shadow-lg mb-4 mx-auto">
            <span className="text-white text-3xl">🎉</span>
          </div>
          <h1 className="text-2xl font-bold mb-4 text-black">Welcome aboard!</h1>
          <p className="text-gray-800 mb-6">
            Your partner account is ready. You can now log in and manage your coupons.
          </p>
          <button
            onClick={handleGoToLogin}
            className="w-full py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-purple-600 to-blue-500 hover:scale-105 transition-transform duration-300 shadow-lg"
          >
            Go to Login
          </button>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen flex items-center justify-center animated-gradient">
      <div className="bg-white rounded-3xl shadow-2xl p-10 w-[380px] backdrop-blur-md bg-opacity-95">
        <h1 className="text-2xl font-bold text-black mb-4">Complete Partner Setup</h1>
        <p className="text-gray-900 mb-6">
          Set your email and password to activate your partner account.
        </p>

        <div className="space-y-3 mb-4">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="New email"
            className="w-full border border-gray-300 rounded-xl p-3 text-black placeholder-gray-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition"
          />
          <input
            type="email"
            value={confirmEmail}
            onChange={(e) => setConfirmEmail(e.target.value)}
            placeholder="Confirm new email"
            className="w-full border border-gray-300 rounded-xl p-3 text-black placeholder-gray-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="New password"
            className="w-full border border-gray-300 rounded-xl p-3 text-black placeholder-gray-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition"
          />
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm new password"
            className="w-full border border-gray-300 rounded-xl p-3 text-black placeholder-gray-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition"
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-purple-600 to-blue-500 hover:scale-105 transition-transform duration-300 disabled:opacity-60 shadow-lg"
        >
          {loading ? "Saving..." : "Save & Finish"}
        </button>
      </div>
    </div>
  );
}