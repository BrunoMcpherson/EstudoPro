import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  async function login(email, password) {
    return signInWithEmailAndPassword(auth, email, password);
  }

  async function register(email, password, userData) {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    await setDoc(doc(db, "usuarios", userCredential.user.uid), {
      perfil: userData,
      tempoTotal: 0,
      pomodorosRealizados: 0,
      paginasLidas: 0,
      ofensiva: { dias: 0, ultimaData: null },
      questoesGerais: { acertos: 0, erros: 0 },
      darkMode: false
    }, { merge: true });
    return userCredential;
  }

  function logout() {
    return signOut(auth);
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const value = { currentUser, login, register, logout };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}