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
  where,
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
  experienceTitle?: string;
  createdAt?: Timestamp | { seconds: number } | null;
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
  const [invites, setInvites] = useState<Invite[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [creatingInvite, setCreatingInvite] = useState(false);

  const [resetEmail, setResetEmail] = useState("");
  const [resetting, setResetting] = useState(false);

  const [partnerId, setPartnerId] = useState("");
  const [code, setCode] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [experienceTitle, setExperienceTitle] = useState("");
  const [creatingCoupon, setCreatingCoupon] = useState(false);
  
  // Coupon lookup state
  const [lookupCode, setLookupCode] = useState("");
  const [lookedUpCoupon, setLookedUpCoupon] = useState<Coupon | null>(null);
  const [lookingUp, setLookingUp] = useState(false);

  const [inviteCheckCode, setInviteCheckCode] = useState("");
  const [inviteResult, setInviteResult] = useState<any>(null);
  const [checkingInvite, setCheckingInvite] = useState(false);
  const [consumingInvite, setConsumingInvite] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [fetching, setFetching] = useState(true);

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

        // Removed coupon list loading - now using lookup instead

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
    if (!partnerId || !code || !validUntil || !experienceTitle.trim()) {
      return alert("All fields required (Partner ID, Code, Valid Until, Experience Title)");
    }
    setCreatingCoupon(true);
    try {
      await addDoc(collection(db, `partnerUsers/${partnerId}/coupons`), {
        code,
        status: "active",
        validUntil: new Date(validUntil),
        partnerId,
        experienceTitle: experienceTitle.trim(),
        createdAt: serverTimestamp(),
      });
      alert("✅ Coupon created.");
      setCode("");
      setValidUntil("");
      setExperienceTitle("");
    } catch (e: any) {
      alert(e.message);
    } finally {
      setCreatingCoupon(false);
    }
  };

  const handleLookupCoupon = async () => {
    if (!lookupCode.trim() || !partnerUser) return alert("Enter a coupon code.");
    setLookingUp(true);
    setLookedUpCoupon(null);
    try {
      const couponsRef = collection(db, `partnerUsers/${partnerUser.uid}/coupons`);
      const q = query(couponsRef, where("code", "==", lookupCode.trim()));
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        alert("Coupon not found.");
      } else {
        const docSnap = snapshot.docs[0];
        const data = docSnap.data();
        setLookedUpCoupon({ id: docSnap.id, ...data } as Coupon);
      }
    } catch (e: any) {
      alert(e.message || "Failed to lookup coupon");
    } finally {
      setLookingUp(false);
    }
  };

  const handleRedeemCoupon = async () => {
    if (!lookedUpCoupon || !partnerUser) return;
    
    if (lookedUpCoupon.status === "redeemed") {
      alert("This coupon has already been redeemed.");
      return;
    }

    if (!confirm(`Are you sure you want to redeem coupon "${lookedUpCoupon.code}"?`)) {
      return;
    }

    try {
      const couponRef = doc(db, `partnerUsers/${partnerUser.uid}/coupons`, lookedUpCoupon.id);
      await updateDoc(couponRef, {
        status: "redeemed",
        redeemedAt: serverTimestamp(),
      });
      
      // Update local state
      setLookedUpCoupon({
        ...lookedUpCoupon,
        status: "redeemed",
        redeemedAt: Timestamp.now(),
      });
      
      alert("✅ Coupon redeemed successfully!");
    } catch (e: any) {
      alert(e.message || "Failed to redeem coupon");
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

        {/* 🎟️ COUPON LOOKUP SECTION */}
        <div className="mb-10">
          <h2 className="font-semibold text-xl text-gray-900 mb-4">Check Coupon</h2>
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <input
              type="text"
              placeholder="Enter coupon code"
              value={lookupCode}
              onChange={(e) => setLookupCode(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLookupCoupon()}
              className="flex-1 border rounded-lg px-3 py-2 text-gray-900 placeholder-gray-500"
            />
            <button
              onClick={handleLookupCoupon}
              disabled={lookingUp}
              className="bg-gradient-to-r from-purple-600 to-blue-500 text-white px-6 py-2 rounded-lg hover:scale-105 transition-transform duration-300 disabled:opacity-60"
            >
              {lookingUp ? "Checking..." : "Check"}
            </button>
          </div>

          {lookedUpCoupon && (
            <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-6 shadow-md">
              <h3 className="text-xl font-bold text-purple-700 mb-4">Coupon Details</h3>
              <div className="space-y-3 text-gray-900">
                <div>
                  <span className="font-semibold">Experience Title:</span>{" "}
                  <span className="text-purple-600">{lookedUpCoupon.experienceTitle || "—"}</span>
                </div>
                <div>
                  <span className="font-semibold">Code:</span>{" "}
                  <span className="text-gray-700">{lookedUpCoupon.code || "—"}</span>
                </div>
                <div>
                  <span className="font-semibold">Status:</span>{" "}
                  <span
                    className={`font-medium ${
                      lookedUpCoupon.status === "active"
                        ? "text-green-600"
                        : lookedUpCoupon.status === "redeemed"
                        ? "text-gray-600"
                        : "text-yellow-600"
                    }`}
                  >
                    {lookedUpCoupon.status || "active"}
                  </span>
                </div>
                {lookedUpCoupon.createdAt && (
                  <div>
                    <span className="font-semibold">Created:</span>{" "}
                    <span className="text-gray-700">
                      {new Date(
                        "seconds" in lookedUpCoupon.createdAt
                          ? lookedUpCoupon.createdAt.seconds * 1000
                          : (lookedUpCoupon.createdAt as any)
                      ).toLocaleString()}
                    </span>
                  </div>
                )}
                {lookedUpCoupon.validUntil && (
                  <div>
                    <span className="font-semibold">Valid Until:</span>{" "}
                    <span className="text-gray-700">
                      {new Date(
                        "seconds" in lookedUpCoupon.validUntil
                          ? lookedUpCoupon.validUntil.seconds * 1000
                          : (lookedUpCoupon.validUntil as any)
                      ).toLocaleString()}
                    </span>
                  </div>
                )}
                {lookedUpCoupon.redeemedAt && (
                  <div>
                    <span className="font-semibold">Redeemed At:</span>{" "}
                    <span className="text-gray-700">
                      {new Date(
                        "seconds" in lookedUpCoupon.redeemedAt
                          ? lookedUpCoupon.redeemedAt.seconds * 1000
                          : (lookedUpCoupon.redeemedAt as any).toDate?.() || lookedUpCoupon.redeemedAt
                      ).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
              {lookedUpCoupon.status === "active" && (
                <button
                  onClick={handleRedeemCoupon}
                  className="mt-4 w-full py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-green-600 to-green-500 hover:scale-105 transition-transform duration-300"
                >
                  Redeem Coupon
                </button>
              )}
            </div>
          )}
        </div>

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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                <input
                  value={partnerId}
                  onChange={(e) => setPartnerId(e.target.value)}
                  placeholder="Partner ID"
                  className="border rounded-lg px-3 py-2 text-gray-900"
                />
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Coupon Code"
                  className="border rounded-lg px-3 py-2 text-gray-900"
                />
                <input
                  type="text"
                  value={experienceTitle}
                  onChange={(e) => setExperienceTitle(e.target.value)}
                  placeholder="Experience Title"
                  className="border rounded-lg px-3 py-2 text-gray-900"
                />
                <input
                  type="date"
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                  className="border rounded-lg px-3 py-2 text-gray-900"
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
