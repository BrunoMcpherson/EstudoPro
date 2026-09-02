import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDYnsuC9yCjj8eXnOOMiWYW1wGxaowr57s",
  authDomain: "estudopro-69257.firebaseapp.com",
  projectId: "estudopro-69257",
  storageBucket: "estudopro-69257.firebasestorage.app",
  messagingSenderId: "801086314261",
  appId: "1:801086314261:web:0e5559f9b530dde8cd7b1c"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);