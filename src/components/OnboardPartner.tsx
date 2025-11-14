"use client";

import { useState } from "react";

export default function OnboardPartner() {
  const [onboardEmail, setOnboardEmail] = useState("");
  const [onboardLink, setOnboardLink] = useState("");
  const [generatingOnboard, setGeneratingOnboard] = useState(false);

  const generateOnboardingLink = async () => {
    if (!onboardEmail.trim()) return alert("Enter a valid email.");
    setGeneratingOnboard(true);
    try {
      const res = await fetch("/api/partners/onboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: onboardEmail.trim() }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Failed to generate link");
      setOnboardLink(data.link);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setGeneratingOnboard(false);
    }
  };

  return (
    <div className="mb-10 text-gray-900">
      {/* 🧭 Partner Onboarding */}
      <h3 className="text-lg font-semibold mb-2">Generate Partner Onboarding Link</h3>
      <div className="flex flex-col sm:flex-row gap-3 mb-3">
        <input
          type="email"
          value={onboardEmail}
          onChange={(e) => setOnboardEmail(e.target.value)}
          placeholder="Existing partner email"
          className="flex-1 border rounded-lg px-3 py-2"
        />
        <button
          onClick={generateOnboardingLink}
          disabled={generatingOnboard}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-500 disabled:opacity-60"
        >
          {generatingOnboard ? "Generating..." : "Generate Link"}
        </button>
      </div>

      {onboardLink && (
        <div className="border rounded-lg p-3 bg-gray-50 text-sm text-gray-900 break-all">
          <p>✅ Share this link with the partner:</p>
          <a href={onboardLink} className="text-blue-600 underline break-all">
            {onboardLink}
          </a>
        </div>
      )}
    </div>
  );
}
