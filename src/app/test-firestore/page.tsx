"use client";
import { useEffect } from "react";
// ✅ Import your firebase setup
import app, { db } from "@/../src/firebase"; // adjust if your firebase.ts path differs
import { doc, getDoc } from "firebase/firestore";

export default function TestFirestore() {
  useEffect(() => {
    (async () => {
      try {
        console.log("✅ Firestore instance:", db.app.options.projectId);

        // Try reading a test doc
        const ref = doc(db, "partnerInvites", "test");
        const snap = await getDoc(ref);

        if (snap.exists()) {
          console.log("🔥 Document data:", snap.data());
        } else {
          console.log("⚠️ Document not found (but Firestore is reachable!)");
        }
      } catch (err: any) {
        console.error("❌ Firestore error:", err.message);
      }
    })();
  }, []);

  return (
    <div style={{ padding: "2rem" }}>
      <h1>Firestore Test Page</h1>
      <p>Check your browser console (not the terminal).</p>
    </div>
  );
}
