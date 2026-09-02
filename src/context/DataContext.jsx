import React, { createContext, useContext, useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useAuth } from './AuthContext';

const DataContext = createContext();

export function useData() {
  return useContext(DataContext);
}

export function DataProvider({ children }) {
  const { currentUser } = useAuth();
  const [dadosEstudo, setDadosEstudo] = useState(null);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    async function fetchData() {
      if (!currentUser) {
        setDadosEstudo(null);
        setLoadingData(false);
        return;
      }
      
      try {
        const docRef = doc(db, "usuarios", currentUser.uid);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          // Validação de segurança para não quebrar a tela se faltar algo no banco
          setDadosEstudo({
            ...data,
            materias: data.materias || [],
            concursos: data.concursos || [],
            pdfs: data.pdfs || [],
            revisoes: data.revisoes || [],
            ofensiva: data.ofensiva || { dias: 0, ultimaData: null },
            tempoTotal: data.tempoTotal || 0,
            pomodorosRealizados: data.pomodorosRealizados || 0,
            paginasLidas: data.paginasLidas || 0,
            questoesGerais: data.questoesGerais || { acertos: 0, erros: 0 }
          });
        }
      } catch (error) {
        console.error("Erro ao buscar dados:", error);
      } finally {
        setLoadingData(false);
      }
    }

    fetchData();
  }, [currentUser]);

  // Função mágica para salvar: Atualiza a tela e o banco ao mesmo tempo!
  async function salvarDados(novosDados) {
    if (!currentUser) return;
    setDadosEstudo(novosDados);
    await setDoc(doc(db, "usuarios", currentUser.uid), novosDados, { merge: true });
  }

  return (
    <DataContext.Provider value={{ dadosEstudo, salvarDados, loadingData }}>
      {children}
    </DataContext.Provider>
  );
}