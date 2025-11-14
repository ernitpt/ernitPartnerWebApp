import { useAuth } from "../hooks/useAuth";
import { useRouter } from "next/router";
import CouponLookup from "../components/CouponLookup";
import AdminInviteManager from "../components/AdminInviteManager";
import { useState } from "react";
import { auth, db } from "../../src/firebase";
import { sendPasswordResetEmail } from "../../src/firebase/auth"; // ✅ correct imports
import { addDoc, collection, serverTimestamp } from "../../src/firebase/firestore"; // ✅ correct imports


export default function Dashboard() {
  console.log("✅ Firestore instance:", db);
  console.log("✅ Project ID:", db.app.options.projectId);
  const { partnerUser, loading, isPartner, isAdmin } = useAuth();
  const router = useRouter();
  const [resetEmail, setResetEmail] = useState("");
  const [resetting, setResetting] = useState(false);
  const [partnerId, setPartnerId] = useState("");
  const [code, setCode] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [creating, setCreating] = useState(false);

  if (loading) return <p className="p-8 text-gray-600">Loading...</p>;
  if (!partnerUser || !isPartner) {
    if (typeof window !== "undefined") {
      router.replace("/login");
    }
    return null;
  }

  const handleSendReset = async () => {
    if (!resetEmail) {
      alert("Enter an email");
      return;
    }
    setResetting(true);
    try {
      await sendPasswordResetEmail(auth, resetEmail);
      alert("Reset email sent");
      setResetEmail("");
    } catch (e: any) {
      alert(e.message ?? "Failed to send reset email");
    } finally {
      setResetting(false);
    }
  };

  const handleCreateCoupon = async () => {
    if (!partnerId || !code || !validUntil) {
      alert("Partner, code, and valid until are required");
      return;
    }
    setCreating(true);
    try {
      await addDoc(collection(db, `partnerCoupons/${partnerId}/coupons`), {
        code,
        status: "active",
        userId: "",
        validUntil: new Date(validUntil),
        partnerId,
        createdAt: serverTimestamp(),
      });
      alert("Coupon created");
      setCode("");
      setValidUntil("");
    } catch (e: any) {
      alert(e.message ?? "Failed to create coupon");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-md p-8">
        <h1 className="text-3xl font-bold text-purple-700 mb-4">
          Partner Dashboard
        </h1>
        <p className="text-gray-700 mb-8">Welcome, {partnerUser.email}</p>

        {/* Coupon Lookup */}
        <CouponLookup partnerId={partnerUser.uid} />

        {isAdmin && (
          <div className="mt-12 border-t pt-8 space-y-10">
            <section>
              <h2 className="text-2xl font-semibold mb-4">Admin Tools</h2>

              {/* Password Reset */}
              <section className="mb-8">
                <h3 className="text-lg font-medium mb-2">Send password reset</h3>
                <div className="flex gap-2">
                  <input
                    type="email"
                    placeholder="partner@example.com"
                    className="border rounded-md p-2 flex-1"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                  />
                  <button
                    onClick={handleSendReset}
                    disabled={resetting}
                    className="bg-indigo-600 text-white px-4 rounded-md"
                  >
                    {resetting ? "Sending..." : "Send reset"}
                  </button>
                </div>
              </section>

              {/* Coupon Creation */}
              <section>
                <h3 className="text-lg font-medium mb-2">Create coupon</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                  <input
                    type="text"
                    placeholder="Partner ID (uid)"
                    className="border rounded-md p-2"
                    value={partnerId}
                    onChange={(e) => setPartnerId(e.target.value)}
                  />
                  <input
                    type="text"
                    placeholder="Coupon code"
                    className="border rounded-md p-2"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                  />
                  <input
                    type="date"
                    className="border rounded-md p-2"
                    value={validUntil}
                    onChange={(e) => setValidUntil(e.target.value)}
                  />
                </div>
                <button
                  onClick={handleCreateCoupon}
                  disabled={creating}
                  className="bg-green-600 text-white px-4 py-2 rounded-md"
                >
                  {creating ? "Creating..." : "Create coupon"}
                </button>
              </section>
            </section>

            <AdminInviteManager
              currentUserId={partnerUser.uid}
              currentUserEmail={partnerUser.email}
            />
          </div>
        )}
      </div>
    </div>
  );
}
