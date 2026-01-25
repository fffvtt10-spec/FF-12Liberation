// src/firebase.js
import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword 
} from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyB3p9kAAb0TJXvJMKzUS6pummdlkbzlt6I",
  authDomain: "fft12l.firebaseapp.com",
  projectId: "fft12l",
  storageBucket: "fft12l.firebasestorage.app",
  messagingSenderId: "459190857682",
  appId: "1:459190857682:web:d857f4bf1fa2e5ec11220b"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Função para Criar Conta
export const signUp = (email, password) => {
  return createUserWithEmailAndPassword(auth, email, password);
};

// Função para Logar
export const login = (email, password) => {
  return signInWithEmailAndPassword(auth, email, password);
};
