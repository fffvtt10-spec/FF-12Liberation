import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getStorage, connectStorageEmulator } from "firebase/storage";

// Configuração do Firebase
export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);

// Inicializa os serviços
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app); 

// --- LÓGICA DE CONEXÃO COM EMULADOR (MODO DEV) ---
// CORREÇÃO: Verifica tanto 'localhost' quanto '127.0.0.1' para evitar conectar na nuvem por engano
if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
  console.log("🔧 MODO DEV: Conectando aos Emuladores do Firebase...");
  
  // Conecta Auth (Porta 9099)
  // Nota: O segundo parâmetro deve ser a URL base completa para evitar erros de protocolo
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  
  // Conecta Firestore (Porta 8080)
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
  
  // Conecta Storage (Porta 9199)
  connectStorageEmulator(storage, "127.0.0.1", 9199);
}

// Suas funções de ajuda originais
export const signUp = (email, password) => createUserWithEmailAndPassword(auth, email, password);
export const login = (email, password) => signInWithEmailAndPassword(auth, email, password);