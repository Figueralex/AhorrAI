import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { initializeAuth, getReactNativePersistence, GoogleAuthProvider, signInWithCredential, signOut } from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";

const firebaseConfig = {
  apiKey: "AIzaSyAgpcqRT3T8GAhH4bhMY1NSfGGP2Y3phG8",
  authDomain: "ahorrai-aed82.firebaseapp.com",
  projectId: "ahorrai-aed82",
  storageBucket: "ahorrai-aed82.firebasestorage.app",
  messagingSenderId: "999195085839",
  appId: "1:999195085839:web:a3fbf43a43e790bf6f677a",
  measurementId: "G-GY35R98JV0"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Manejo perezoso de Auth para evitar Crash al inicio
let _auth = null;

export const getAuthInstance = () => {
  if (!_auth) {
    _auth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage)
    });
  }
  return _auth;
};

export const loginWithGoogle = async (idToken) => {
  const auth = getAuthInstance();
  const credential = GoogleAuthProvider.credential(idToken);
  return await signInWithCredential(auth, credential);
};

export const logoutUser = async () => {
  const auth = getAuthInstance();
  await signOut(auth);
};

export { app, db };
