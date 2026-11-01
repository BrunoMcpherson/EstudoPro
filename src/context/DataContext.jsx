import React, { createContext, useContext, useState, useEffect } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from './AuthContext';

const DataContext = createContext();

export function DataProvider({ children }) {
  const { currentUser } = useAuth();
  const [dadosGlobais, setDadosGlobais] = useState(null);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!currentUser) {
      setDadosGlobais(null);
      setLoadingData(false);
      return;
    }

    const docRef = doc(db, 'usuarios', currentUser.uid);
    
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        
        // Migração segura caso ainda esteja na estrutura antiga
        if (!data.projetos) {
           const idPadrao = 'proj_' + Date.now();
           const projetoPadrao = {
             nome: data.concursos?.[0]?.nome || 'Meu Edital',
             dataProva: data.concursos?.[0]?.data || '',
             materias: data.materias || [],
             flashcards: data.flashcards || [],
             revisoes: data.revisoes || [],
             resumos: data.resumos || [],
             pdfs: data.pdfs || [],
             tempoTotal: data.tempoTotal || 0,
             questoesGerais: data.questoesGerais || { acertos: 0, erros: 0 },
             pomodorosRealizados: data.pomodorosRealizados || 0,
             paginasLidas: data.paginasLidas || 0,
             historicoDias: data.historicoDias || {},
             historicoEstudos: data.historicoEstudos || [],
             ofensiva: data.ofensiva || { dias: 0, ultimaData: null }
           };

           const newData = {
             darkMode: data.darkMode ?? true,
             projetoAtivoId: idPadrao,
             projetos: { [idPadrao]: projetoPadrao }
           };
           // BLINDAGEM: merge: true evita apagar dados existentes acidentalmente
           setDoc(docRef, newData, { merge: true });
        } else {
          setDadosGlobais(data);
        }
      } else {
         // BLINDAGEM CRÍTICA: Ignora se for apenas leitura vazia de cache offline
         if (docSnap.metadata.fromCache) return;

         const novoId = 'proj_' + Date.now();
         setDoc(docRef, {
           darkMode: true,
           projetoAtivoId: novoId,
           projetos: { [novoId]: { nome: 'Meu Primeiro Edital', dataProva: '' } }
         }, { merge: true });
      }
      setLoadingData(false);
    });

    return () => unsubscribe();
  }, [currentUser]);

  async function salvarDados(dadosAtualizadosDoProjeto) {
    if (!currentUser || !dadosGlobais) return;
    
    const { projetoAtivoId, projetos } = dadosGlobais;
    
    const darkModeAtualizado = dadosAtualizadosDoProjeto.darkMode !== undefined 
      ? dadosAtualizadosDoProjeto.darkMode 
      : dadosGlobais.darkMode;

    const { darkMode, concursos, ...dadosLimpos } = dadosAtualizadosDoProjeto;
    
    if (concursos && concursos.length > 0) {
      dadosLimpos.nome = concursos[0].nome;
      dadosLimpos.dataProva = concursos[0].data;
    }

    const novoProjetos = {
      ...projetos,
      [projetoAtivoId]: {
        ...projetos[projetoAtivoId],
        ...dadosLimpos
      }
    };

    await setDoc(doc(db, 'usuarios', currentUser.uid), {
      ...dadosGlobais,
      darkMode: darkModeAtualizado,
      projetos: novoProjetos
    }, { merge: true });
  }

  async function criarProjeto(nome) {
    if (!currentUser || !dadosGlobais) return;
    const novoId = 'proj_' + Date.now();
    const novoProjeto = { 
      nome, 
      dataProva: '', 
      materias: [], 
      tempoTotal: 0, 
      questoesGerais: { acertos: 0, erros: 0 },
      pomodorosRealizados: 0,
      paginasLidas: 0,
      ofensiva: { dias: 0, ultimaData: null }
    };
    
    await setDoc(doc(db, 'usuarios', currentUser.uid), {
      ...dadosGlobais,
      projetoAtivoId: novoId,
      projetos: { ...dadosGlobais.projetos, [novoId]: novoProjeto }
    }, { merge: true });
  }

  async function mudarProjeto(idProjeto) {
    if (!currentUser || !dadosGlobais) return;
    await setDoc(doc(db, 'usuarios', currentUser.uid), { projetoAtivoId: idProjeto }, { merge: true });
  }

  const dadosEstudo = dadosGlobais && dadosGlobais.projetos && dadosGlobais.projetoAtivoId
    ? { 
        ...dadosGlobais.projetos[dadosGlobais.projetoAtivoId], 
        darkMode: dadosGlobais.darkMode,
        concursos: [{ 
          nome: dadosGlobais.projetos[dadosGlobais.projetoAtivoId]?.nome || 'Meu Edital', 
          data: dadosGlobais.projetos[dadosGlobais.projetoAtivoId]?.dataProva || '' 
        }]
      }
    : null;

  return (
    <DataContext.Provider value={{ 
      dadosEstudo, loadingData, salvarDados, 
      dadosGlobais, criarProjeto, mudarProjeto 
    }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  return useContext(DataContext);
}