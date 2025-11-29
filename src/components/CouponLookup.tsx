"use client";

import { useState } from "react";
import { db } from "../firebase"; // ✅ Your firebase.ts exports db
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  runTransaction,
  serverTimestamp,
  Timestamp,
  Firestore,
} from "firebase/firestore"; // ✅ Import directly from firebase/firestore

type CouponRecord = {
  id: string;
  status: string;
  userId: string;
  validUntil: Timestamp | Date | null;
  partnerId: string;
};

export default function CouponLookup({ partnerId }: { partnerId: string }) {
  const [code, setCode] = useState("");
  const [coupon, setCoupon] = useState<CouponRecord | null>(null);
  const [loading, setLoading] = useState(false);

  /** =======================
   * FORMAT DATE HELPER
   * ======================= **/
  const formatDate = (value: any) => {
    try {
      if (!value) return "--";
      if (value instanceof Date) return value.toDateString();
      if (value instanceof Timestamp) return value.toDate().toDateString();
      if (typeof value === "string") return new Date(value).toDateString();
      return "--";
    } catch {
      return "--";
    }
  };

  /** =======================
   * SEARCH COUPON BY CODE
   * ======================= **/
  const handleSearch = async () => {
    setLoading(true);
    setCoupon(null);

    try {
      // ✅ Fix: correct subcollection path
      const couponsRef = collection(db, `partnerUsers/${partnerId}/coupons`);
      const q = query(couponsRef, where("code", "==", code.trim()));
      const result = await getDocs(q);

      if (result.empty) {
        alert("Coupon not found");
      } else {
        const docSnap = result.docs[0];
        const data = docSnap.data() as Omit<CouponRecord, "id">;
        setCoupon({ id: docSnap.id, ...data });
      }
    } catch (err: any) {
      alert(err.message ?? "Failed to search for coupon");
    } finally {
      setLoading(false);
    }
  };

  /** =======================
   * MARK COUPON AS REDEEMED
   * ======================= **/
  const handleRedeem = async () => {
    if (!coupon) return;

    try {
      await runTransaction(db, async (transaction: any) => {
        // ✅ Fix: use correct path
        const couponRef = doc(db, `partnerUsers/${partnerId}/coupons`, coupon.id);
        const snap = await transaction.get(couponRef);

        if (!snap.exists()) throw new Error("Coupon not found");
        const data = snap.data() as any;

        if (data.status !== "active") {
          throw new Error("Coupon is not active or already redeemed");
        }

        transaction.update(couponRef, {
          status: "redeemed",
          redeemedAt: serverTimestamp(),
        });
      });

      alert("✅ Coupon marked as redeemed.");
      setCoupon(null);
      setCode("");
    } catch (e: any) {
      alert(e.message ?? "Failed to redeem coupon");
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-md max-w-md">
      <h2 className="text-lg font-semibold mb-3">Check a Coupon</h2>

      <div className="flex space-x-2 mb-3">
        <input
          type="text"
          placeholder="Enter coupon code"
          className="border rounded-md flex-grow p-2"
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />
        <button
          onClick={handleSearch}
          disabled={loading}
          className="bg-blue-600 text-white px-4 rounded-md disabled:bg-blue-400"
        >
          {loading ? "..." : "Search"}
        </button>
      </div>

      {coupon && (
        <div className="border-t pt-4 mt-4">
          <p>
            <strong>Status:</strong> {coupon.status}
          </p>
          <p>
            <strong>User:</strong> {coupon.userId || "--"}
          </p>
          <p>
            <strong>Expires:</strong> {formatDate(coupon.validUntil)}
          </p>

          {coupon.status === "active" && (
            <button
              onClick={handleRedeem}
              className="mt-4 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
            >
              Redeem Now
            </button>
          )}
        </div>
      )}
    </div>
  );
}
