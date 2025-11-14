"use client";

import { useEffect, useState } from "react";
import { auth, db } from "@/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import type { PartnerUserRecord } from "@/types/partner";

export function useAuth() {
  const [partnerUser, setPartnerUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPartner, setIsPartner] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setPartnerUser(firebaseUser);

      if (firebaseUser) {
        // ✅ FIXED: correct collection name 'partnerUsers'
        const partnerRef = doc(db, "partnerUsers", firebaseUser.uid);
        const partnerSnap = await getDoc(partnerRef);

        let record: PartnerUserRecord | null = null;

        if (partnerSnap.exists()) {
          record = partnerSnap.data() as PartnerUserRecord;
        } else {
          // optional fallback (not needed if you don’t use aggregated doc)
          const fallbackSnap = await getDoc(doc(db, "partnerUsers", "partnerUsers"));
          if (fallbackSnap.exists()) {
            const map = fallbackSnap.data() as Record<string, PartnerUserRecord>;
            record = map[firebaseUser.uid] ?? null;
          }
        }

        if (record) {
          setIsPartner(record.userType === "partner");
          setIsAdmin(Boolean(record.isAdmin));
        } else {
          setIsPartner(false);
          setIsAdmin(false);
        }
      } else {
        setIsPartner(false);
        setIsAdmin(false);
      }

      setLoading(false);
    });

    return unsub;
  }, []);

  return { partnerUser, loading, isPartner, isAdmin };
}
