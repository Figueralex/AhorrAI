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

// Initialize Firebase Auth con persistencia en React Native
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});

export const loginWithGoogle = async (idToken) => {
  const credential = GoogleAuthProvider.credential(idToken);
  return await signInWithCredential(auth, credential);
};

export const logoutUser = async () => {
  await signOut(auth);
};

export { app, auth, db };
