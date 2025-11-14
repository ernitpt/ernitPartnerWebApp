"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../hooks/useAuth";
import { auth, db } from "@/firebase";
import OnboardPartner from "@/components/OnboardPartner";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  orderBy,
  updateDoc,
  setDoc,
  addDoc,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { sendPasswordResetEmail } from "firebase/auth";
import { checkInvite, consumeInvite } from "../../services/inviteService";

type PartnerInfo = {
  email: string;
  isAdmin: boolean;
  userType: string;
  name: string;
  createdFromInvite?: string;
  mapsUrl?: string;
};

type Coupon = {
  id: string;
  title?: string;
  description?: string;
  discount?: number;
  status?: string;
  redeemedAt?: Timestamp | null;
  userId?: string;
  code?: string;
  validUntil?: Timestamp | { seconds: number } | null;
};

type Invite = {
  id: string;
  status: string;
  createdAt: any;
  createdBy: string;
  createdByEmail: string;
};

export default function PartnerDashboardPage() {
  const { partnerUser, loading, isPartner, isAdmin } = useAuth();
  const router = useRouter();

  const [partner, setPartner] = useState<PartnerInfo | null>(null);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [creatingInvite, setCreatingInvite] = useState(false);

  const [resetEmail, setResetEmail] = useState("");
  const [resetting, setResetting] = useState(false);

  const [partnerId, setPartnerId] = useState("");
  const [code, setCode] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [creatingCoupon, setCreatingCoupon] = useState(false);

  const [inviteCheckCode, setInviteCheckCode] = useState("");
  const [inviteResult, setInviteResult] = useState<any>(null);
  const [checkingInvite, setCheckingInvite] = useState(false);
  const [consumingInvite, setConsumingInvite] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [fetching, setFetching] = useState(true);
  const [redeeming, setRedeeming] = useState<string | null>(null);
  const [confirmingCoupon, setConfirmingCoupon] = useState<Coupon | null>(null);
  const [revoking, setRevoking] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!partnerUser || !isPartner) {
      router.replace("/login");
      return;
    }

    const loadData = async () => {
      try {
        const partnerRef = doc(db, "partnerUsers", partnerUser.uid);
        const partnerSnap = await getDoc(partnerRef);

        if (!partnerSnap.exists()) {
          setError("Partner profile not found.");
          setFetching(false);
          router.replace("/");
          return;
        }

        const partnerData = partnerSnap.data() as PartnerInfo;
        setPartner(partnerData);

        const couponsRef = collection(db, "partnerUsers", partnerUser.uid, "coupons");
        const q = query(couponsRef, orderBy("createdAt", "desc"));
        const snapshot = await getDocs(q);
        setCoupons(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as Coupon[]);

        if (partnerData.isAdmin) {
          const invitesRef = collection(db, "partnerInvites");
          const invitesQuery = query(invitesRef, orderBy("createdAt", "desc"));
          const inviteSnap = await getDocs(invitesQuery);
          setInvites(inviteSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as Invite[]);
        }
      } catch (err: any) {
        setError(err.message ?? "Failed to load dashboard.");
      } finally {
        setFetching(false);
      }
    };

    loadData();
  }, [partnerUser, loading, isPartner, router]);

  /** ========== FUNCTIONS ========== **/

  const markRedeemed = async (couponId: string) => {
    if (!partnerUser) return;
    try {
      setRedeeming(couponId);
      const couponRef = doc(db, "partnerUsers", partnerUser.uid, "coupons", couponId);
      await updateDoc(couponRef, {
        status: "redeemed",
        redeemedAt: serverTimestamp(),
      });
      setCoupons((prev) =>
        prev.map((c) => (c.id === couponId ? { ...c, status: "redeemed", redeemedAt: Timestamp.now() } : c))
      );
    } catch (err: any) {
      alert(err.message);
    } finally {
      setRedeeming(null);
      setConfirmingCoupon(null);
    }
  };

  const createInvite = async () => {
    if (!partnerUser || !isAdmin) return alert("Not authorized.");
    if (!inviteEmail.trim()) return alert("Enter an email.");

    try {
      setCreatingInvite(true);
      const inviteId = Math.random().toString(36).substring(2, 12);
      await setDoc(doc(db, "partnerInvites", inviteId), {
        status: "pending",
        createdAt: serverTimestamp(),
        createdBy: partnerUser.uid,
        createdByEmail: partner?.email ?? partnerUser.email ?? null,
      });

      alert(`✅ Invite created!\n${window.location.origin}/signup?invite=${inviteId}`);
      setInviteEmail("");
    } catch (e: any) {
      alert(e.message);
    } finally {
      setCreatingInvite(false);
    }
  };

  const handleCreateCoupon = async () => {
    if (!partnerId || !code || !validUntil) return alert("All fields required");
    setCreatingCoupon(true);
    try {
      await addDoc(collection(db, `partnerCoupons/${partnerId}/coupons`), {
        code,
        status: "active",
        validUntil: new Date(validUntil),
        partnerId,
        createdAt: serverTimestamp(),
      });
      alert("✅ Coupon created.");
      setCode("");
      setValidUntil("");
    } catch (e: any) {
      alert(e.message);
    } finally {
      setCreatingCoupon(false);
    }
  };

  const handleSendReset = async () => {
    if (!resetEmail.trim()) return alert("Enter an email.");
    setResetting(true);
    try {
      await sendPasswordResetEmail(auth, resetEmail.trim());
      alert("✅ Reset email sent!");
      setResetEmail("");
    } catch (e: any) {
      alert(e.message);
    } finally {
      setResetting(false);
    }
  };

  const handleCheckInvite = async () => {
    if (!inviteCheckCode.trim()) return;
    setCheckingInvite(true);
    try {
      const result = await checkInvite(inviteCheckCode);
      setInviteResult(result);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setCheckingInvite(false);
    }
  };

  const handleConsumeInvite = async () => {
    if (!inviteCheckCode.trim() || !partnerUser?.uid) return;
    setConsumingInvite(true);
    try {
      await consumeInvite(inviteCheckCode, partnerUser.uid);
      alert("✅ Invite consumed successfully!");
    } catch (e: any) {
      alert(e.message);
    } finally {
      setConsumingInvite(false);
    }
  };

  /** ========== RENDER ========== **/

  if (loading || fetching)
    return <div className="flex items-center justify-center h-screen text-gray-600">Loading dashboard...</div>;
  if (error)
    return <div className="flex items-center justify-center h-screen text-red-600">{error}</div>;

  return (
    <div className="min-h-screen flex items-center justify-center animated-gradient">
      <div className="bg-white rounded-3xl shadow-2xl p-10 w-full max-w-5xl backdrop-blur-md bg-opacity-95">
        {/* HEADER */}
        <div className="flex flex-col items-center mb-8">
          <div className="bg-gradient-to-br from-purple-600 to-blue-500 rounded-full w-20 h-20 flex items-center justify-center shadow-lg mb-4">
            <span className="text-white text-3xl font-bold">E</span>
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900">Partner Dashboard</h1>
          <p className="text-gray-800 mt-1 text-center">
            Welcome back, <span className="font-semibold">{partner?.email}</span>!
          </p>
        </div>

        {/* 🎟️ COUPONS SECTION (unchanged, original style) */}
        <h2 className="font-semibold text-xl text-gray-900 mb-4">Your Coupons</h2>
        {coupons.length === 0 ? (
          <p className="text-gray-700 text-center">No coupons yet. They’ll appear here when created.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {coupons.map((coupon) => (
              <div
                key={coupon.id}
                className={`rounded-xl p-4 shadow-sm transition border ${
                  coupon.status === "redeemed"
                    ? "bg-gray-100 border-gray-200 opacity-80"
                    : "bg-purple-50 border-purple-200 hover:shadow-md"
                }`}
              >
                <h3 className="text-purple-700 font-semibold">{coupon.code || "Unnamed Coupon"}</h3>
                {coupon.description && <p className="text-gray-700 text-sm">{coupon.description}</p>}
                {coupon.discount && <p className="text-gray-900 font-medium mt-1">Discount: {coupon.discount}%</p>}
                <p
                  className={`mt-2 text-sm font-medium ${
                    coupon.status === "redeemed" ? "text-green-600" : "text-yellow-600"
                  }`}
                >
                  Status: {coupon.status ?? "active"}
                </p>
                {coupon.validUntil && (
                  <p className="text-gray-500 text-xs mt-1">
                    Valid until:{" "}
                    {new Date(
                      "seconds" in coupon.validUntil
                        ? coupon.validUntil.seconds * 1000
                        : (coupon.validUntil as any)
                    ).toLocaleDateString()}
                  </p>
                )}
                {coupon.redeemedAt && (
                  <p className="text-gray-500 text-xs mt-1">
                    Redeemed on: {new Date(coupon.redeemedAt.toDate?.() ?? coupon.redeemedAt).toLocaleString()}
                  </p>
                )}
                {coupon.status !== "redeemed" && (
                  <button
                    onClick={() => setConfirmingCoupon(coupon)}
                    className="mt-4 w-full py-2 rounded-xl font-semibold text-white bg-gradient-to-r from-purple-600 to-blue-500 hover:scale-105 transition-transform duration-300"
                  >
                    Mark as Redeemed
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ✅ Confirmation Modal */}
        {confirmingCoupon && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-2xl shadow-xl w-80 text-center">
              <h3 className="text-lg font-bold text-gray-900 mb-3">Confirm Redemption</h3>
              <p className="text-gray-700 mb-6">
                Are you sure you want to mark{" "}
                <span className="font-semibold text-purple-600">{confirmingCoupon.code}</span> as redeemed?
              </p>
              <div className="flex justify-center gap-3">
                <button
                  onClick={() => markRedeemed(confirmingCoupon.id)}
                  disabled={redeeming === confirmingCoupon.id}
                  className="px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-500 transition disabled:opacity-50"
                >
                  {redeeming === confirmingCoupon.id ? "Marking..." : "Confirm"}
                </button>
                <button
                  onClick={() => setConfirmingCoupon(null)}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-xl hover:bg-gray-300 transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ⚙️ ADMIN TOOLS */}
        {isAdmin && (
          <div className="mt-12 border-t pt-10 text-gray-900">
            <h2 className="text-2xl font-bold mb-6">Admin Tools</h2>
            {/* 🧭 Partner Onboarding */}
            <OnboardPartner />
            
            {/* 💌 Create Invite */}
            <div className="mb-10">
              <h3 className="text-lg font-semibold mb-2">Create Signup Invite</h3>
              <div className="flex flex-col sm:flex-row gap-3 mb-3">
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="Enter invite email"
                  className="flex-1 border rounded-lg px-3 py-2"
                />
                <button
                  onClick={createInvite}
                  disabled={creatingInvite}
                  className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-500 disabled:opacity-60"
                >
                  {creatingInvite ? "Creating..." : "Create Invite"}
                </button>
              </div>
            </div>

            {/* 🎁 Create Partner Coupon */}
            <div className="mb-10">
              <h3 className="text-lg font-semibold mb-2">Create Coupon for Partner</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                <input
                  value={partnerId}
                  onChange={(e) => setPartnerId(e.target.value)}
                  placeholder="Partner ID"
                  className="border rounded-lg px-3 py-2"
                />
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Coupon Code"
                  className="border rounded-lg px-3 py-2"
                />
                <input
                  type="date"
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                  className="border rounded-lg px-3 py-2"
                />
              </div>
              <button
                onClick={handleCreateCoupon}
                disabled={creatingCoupon}
                className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-500 disabled:opacity-60"
              >
                {creatingCoupon ? "Creating..." : "Create Coupon"}
              </button>
            </div>

            {/* ✉️ Reset Password */}
            <div className="mb-10">
              <h3 className="text-lg font-semibold mb-2">Send Password Reset Email</h3>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="User email"
                  className="flex-1 border rounded-lg px-3 py-2"
                />
                <button
                  onClick={handleSendReset}
                  disabled={resetting}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-500 disabled:opacity-60"
                >
                  {resetting ? "Sending..." : "Send Reset"}
                </button>
              </div>
            </div>

            {/* 🧾 Invite Validation */}
            <div>
              <h3 className="text-lg font-semibold mb-2">Validate or Consume Invite</h3>
              <div className="flex flex-col sm:flex-row gap-3 mb-3">
                <input
                  value={inviteCheckCode}
                  onChange={(e) => setInviteCheckCode(e.target.value)}
                  placeholder="Enter invite code"
                  className="flex-1 border rounded-lg px-3 py-2"
                />
                <button
                  onClick={handleCheckInvite}
                  disabled={checkingInvite}
                  className="bg-gray-800 text-white px-4 py-2 rounded-lg hover:bg-gray-700 disabled:opacity-60"
                >
                  {checkingInvite ? "Checking..." : "Validate"}
                </button>
                <button
                  onClick={handleConsumeInvite}
                  disabled={consumingInvite}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-500 disabled:opacity-60"
                >
                  {consumingInvite ? "Consuming..." : "Consume"}
                </button>
              </div>

              {inviteResult && (
                <div className="border rounded-lg p-4 bg-gray-50 text-sm text-gray-900">
                  <p>Status: <span className="font-semibold">{inviteResult.status}</span></p>
                  <p>Email: {inviteResult.email || "—"}</p>
                  <p>Role: {inviteResult.role || "—"}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
