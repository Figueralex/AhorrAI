import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAgpcqRT3T8GAhH4bhMY1NSfGGP2Y3phG8",
  authDomain: "ahorrai-aed82.firebaseapp.com",
  projectId: "ahorrai-aed82",
  storageBucket: "ahorrai-aed82.firebasestorage.app",
  messagingSenderId: "999195085839",
  appId: "1:999195085839:web:a3fbf43a43e790bf6f677a",
  measurementId: "G-GY35R98JV0"
};

// Initialize Firebase (solo Firestore, sin Auth por ahora)
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Auth desactivado temporalmente para estabilidad del APK
const auth = null;

export { app, auth, db };
