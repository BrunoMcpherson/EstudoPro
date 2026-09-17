import React, { createContext, useContext, useState, useEffect } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase'; // Verifique se o caminho do seu firebase.js está correto
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
        
        // MUDANÇA: Se for a estrutura antiga, faz a migração automática para Multi-Provas
        if (!data.projetos) {
           const idPadrao = 'proj_' + Date.now();
           const projetoPadrao = {
             nome: data.concursos?.[0]?.nome || 'Meu Edital',
             dataProva: data.concursos?.[0]?.data || '',
             materias: data.materias || [],
             flashcards: data.flashcards || [],
             revisoes: data.revisoes || [],
             tempoTotal: data.tempoTotal || 0,
             questoesGerais: data.questoesGerais || { acertos: 0, erros: 0 },
             pomodorosRealizados: data.pomodorosRealizados || 0,
             paginasLidas: data.paginasLidas || 0,
             historicoDias: data.historicoDias || {},
             historicoEstudos: data.historicoEstudos || [],
             ofensiva: data.ofensiva || { dias: 0, ultimaData: null }
           };

           const newData = {
             darkMode: data.darkMode || false,
             projetoAtivoId: idPadrao,
             projetos: { [idPadrao]: projetoPadrao }
           };
           setDoc(docRef, newData); // Salva a migração sem perder nada
        } else {
          setDadosGlobais(data);
        }
      } else {
         // Criação para usuário totalmente novo
         const novoId = 'proj_' + Date.now();
         setDoc(docRef, {
           darkMode: false,
           projetoAtivoId: novoId,
           projetos: { [novoId]: { nome: 'Meu Primeiro Edital', dataProva: '' } }
         });
      }
      setLoadingData(false);
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Função para salvar dados apenas no PROJETO ATIVO
  async function salvarDados(dadosAtualizadosDoProjeto) {
    if (!currentUser || !dadosGlobais) return;
    
    const { projetoAtivoId, projetos } = dadosGlobais;
    
    // O dark mode é a única coisa que fica fora do projeto (é uma config do usuário)
    const darkModeAtualizado = dadosAtualizadosDoProjeto.darkMode !== undefined 
      ? dadosAtualizadosDoProjeto.darkMode 
      : dadosGlobais.darkMode;

    const { darkMode, concursos, ...dadosLimpos } = dadosAtualizadosDoProjeto;
    
    // Se o Dashboard antigo mandou alterar o nome do concurso, salva no projeto atual
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

  // Novas funções para gerenciar provas
  async function criarProjeto(nome) {
    if (!currentUser || !dadosGlobais) return;
    const novoId = 'proj_' + Date.now();
    const novoProjeto = { nome, dataProva: '', materias: [], tempoTotal: 0, questoesGerais: {acertos:0, erros:0} };
    
    await setDoc(doc(db, 'usuarios', currentUser.uid), {
      ...dadosGlobais,
      projetoAtivoId: novoId, // Já entra na nova prova
      projetos: { ...dadosGlobais.projetos, [novoId]: novoProjeto }
    }, { merge: true });
  }

  async function mudarProjeto(idProjeto) {
    if (!currentUser || !dadosGlobais) return;
    await setDoc(doc(db, 'usuarios', currentUser.uid), { projetoAtivoId: idProjeto }, { merge: true });
  }

  // O "dadosEstudo" que as telas veem é APENAS o projeto ativo. Mágica pura!
  const dadosEstudo = dadosGlobais && dadosGlobais.projetos && dadosGlobais.projetoAtivoId
    ? { 
        ...dadosGlobais.projetos[dadosGlobais.projetoAtivoId], 
        darkMode: dadosGlobais.darkMode,
        // Mantém a compatibilidade com o Dashboard que usa .concursos[0]
        concursos: [{ 
          nome: dadosGlobais.projetos[dadosGlobais.projetoAtivoId].nome, 
          data: dadosGlobais.projetos[dadosGlobais.projetoAtivoId].dataProva 
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