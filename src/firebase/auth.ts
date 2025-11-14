// Re-export Auth helpers to keep every consumer on the same Firebase Auth instance.
export {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
} from "firebase/auth";

export type { User } from "firebase/auth";

