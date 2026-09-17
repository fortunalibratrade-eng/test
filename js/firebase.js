// ═══════════════════════════════════════════
// firebase.js — Inisialisasi Firebase
// Semua konfigurasi & instance Firebase terpusat di sini,
// supaya app.js tinggal import tanpa perlu tahu detail setup.
// ═══════════════════════════════════════════
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const fbConfig = {
  apiKey: "AIzaSyA9EbbQR-F1NAC0V00Eg56sgOGEkoAviHc",
  authDomain: "apk-keuangan-fe1ec.firebaseapp.com",
  projectId: "apk-keuangan-fe1ec",
  storageBucket: "apk-keuangan-fe1ec.firebasestorage.app",
  messagingSenderId: "923241572449",
  appId: "1:923241572449:web:34c2176130974cf0b5a220"
};

// Catatan: apiKey Firebase di client memang publik (bukan secret),
// aman ditaruh di repo GitHub — keamanan sesungguhnya ada di
// firestore.rules (lihat file firestore.rules di root project ini).
const fbApp = initializeApp(fbConfig);

export const auth = getAuth(fbApp);
export const db   = getFirestore(fbApp);

export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('email');
googleProvider.addScope('profile');
