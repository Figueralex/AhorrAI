import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import {
  initializeAuth,
  getAuth,
  getReactNativePersistence,
  GoogleAuthProvider,
  signInWithCredential,
  signOut
} from "firebase/auth";
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

// Evitar re-inicialización si ya existe la app
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);

// Modificamos la exportación para inicializar auth perezosamente (lazy)
// Esto evita el error "Component auth has not been registered yet" durante la carga del módulo
let _auth = null;

export const getAuthInstance = () => {
  if (!_auth) {
    try {
      _auth = initializeAuth(app, {
        persistence: getReactNativePersistence(AsyncStorage),
      });
    } catch (e) {
      // Si ya fue inicializado, obtener la instancia
      _auth = getAuth(app);
    }
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
