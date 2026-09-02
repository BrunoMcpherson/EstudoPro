import React, { useState } from 'react';
import { useData } from '../context/DataContext';

function FlashcardItem({ card, onDeletar }) {
  const [virado, setVirado] = useState(false);

  return (
    <div className="relative w-full h-48 md:h-56 cursor-pointer perspective-1000 group" onClick={() => setVirado(!virado)}>
      <div className={`relative w-full h-full transition-transform duration-500 transform-style-3d ${virado ? 'rotate-y-180' : ''}`}>
        <div className="absolute w-full h-full backface-hidden bg-white dark:bg-gray-800 rounded-2xl shadow-md p-6 flex flex-col justify-center items-center text-center border-t-4 border-indigo-500 dark:border-gray-600">
          <span className="absolute top-2 left-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">{card.materia}</span>
          <button onClick={(e) => { e.stopPropagation(); onDeletar(card.id); }} className="absolute top-2 right-2 text-gray-300 hover:text-red-500 hidden md:group-hover:block transition z-10"><i className="fa-solid fa-trash"></i></button>
          <p className="font-black text-gray-800 dark:text-gray-100 text-sm md:text-lg px-2">{card.frente}</p>
          <span className="absolute bottom-2 text-[10px] md:text-xs text-indigo-400 font-bold bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1 rounded-full mt-4"><i className="fa-solid fa-rotate mr-1"></i> Virar</span>
        </div>
        <div className="absolute w-full h-full backface-hidden rotate-y-180 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-2xl shadow-md p-6 flex flex-col justify-center items-center text-center overflow-y-auto scroll-custom">
          <p className="text-white font-bold text-sm md:text-base">{card.verso}</p>
        </div>
      </div>
    </div>
  );
}

export default function Flashcards() {
  const { dadosEstudo, salvarDados } = useData();
  const [mostrarForm, setMostrarForm] = useState(false);
  const [materia, setMateria] = useState('');
  const [frente, setFrente] = useState('');
  const [verso, setVerso] = useState('');
  
  const [layout, setLayout] = useState(dadosEstudo.layoutFlashcards || 'grid');

  const flashcards = dadosEstudo.flashcards || [];
  const materias = dadosEstudo.materias || [];

  async function handleSalvar(e) {
    e.preventDefault();
    if (!materia || !frente || !verso) return alert('Preencha todos os campos!');
    const novoCard = { id: Date.now(), materia, frente, verso };
    await salvarDados({ ...dadosEstudo, flashcards: [...flashcards, novoCard] });
    setFrente(''); setVerso(''); setMostrarForm(false);
  }

  async function handleDeletar(id) {
    if (!window.confirm('Excluir este cartão?')) return;
    await salvarDados({ ...dadosEstudo, flashcards: flashcards.filter(f => f.id !== id) });
  }

  return (
    <div className="bg-white dark:bg-gray-800 p-4 md:p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 w-full animate-fade-in">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h2 className="text-xl md:text-2xl font-black text-gray-800 dark:text-white">
          <i className="fa-solid fa-clone text-indigo-500 mr-2"></i> Flashcards
        </h2>
        <button onClick={() => setMostrarForm(!mostrarForm)} className="w-full md:w-auto bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 font-bold px-4 py-2 rounded-lg border border-indigo-200 dark:border-indigo-800 shadow-sm">
          <i className={`fa-solid ${mostrarForm ? 'fa-xmark' : 'fa-plus'} mr-1`}></i> {mostrarForm ? 'Cancelar' : 'Criar Novo Cartão'}
        </button>
      </div>

      {mostrarForm && (
        <form onSubmit={handleSalvar} className="bg-gray-50 dark:bg-gray-700/50 p-4 md:p-6 rounded-xl border dark:border-gray-600 mb-6 space-y-4">
          <select value={materia} onChange={(e) => setMateria(e.target.value)} required className="w-full md:w-1/3 p-2.5 border rounded-lg bg-white dark:bg-gray-800 dark:text-white font-bold outline-none">
            <option value="">Selecione a matéria...</option>
            {materias.map((m, i) => <option key={i} value={m.nome}>{m.nome}</option>)}
          </select>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-xs font-black text-gray-500 uppercase mb-1">Frente (Pergunta)</label>
              <textarea value={frente} onChange={(e) => setFrente(e.target.value)} required rows="3" className="w-full p-3 border rounded-lg bg-white dark:bg-gray-800 dark:text-white outline-none resize-none"></textarea>
            </div>
            <div className="flex-1">
              <label className="block text-xs font-black text-indigo-500 uppercase mb-1">Verso (Resposta)</label>
              <textarea value={verso} onChange={(e) => setVerso(e.target.value)} required rows="3" className="w-full p-3 border rounded-lg bg-indigo-50 dark:bg-indigo-900/20 dark:text-white outline-none resize-none"></textarea>
            </div>
          </div>
          <div className="flex justify-end">
            <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-6 rounded-lg w-full md:w-auto transition">Adicionar Cartão</button>
          </div>
        </form>
      )}

      <div className="flex justify-end mb-4 bg-gray-100 dark:bg-gray-700 w-max ml-auto rounded-lg p-1">
        <button onClick={() => { setLayout('grid'); salvarDados({...dadosEstudo, layoutFlashcards: 'grid'}); }} className={`px-4 py-1 rounded text-sm transition ${layout === 'grid' ? 'bg-white dark:bg-gray-600 text-indigo-600 shadow-sm' : 'text-gray-500'}`}><i className="fa-solid fa-border-all"></i></button>
        <button onClick={() => { setLayout('lista'); salvarDados({...dadosEstudo, layoutFlashcards: 'lista'}); }} className={`px-4 py-1 rounded text-sm transition ${layout === 'lista' ? 'bg-white dark:bg-gray-600 text-indigo-600 shadow-sm' : 'text-gray-500'}`}><i className="fa-solid fa-list"></i></button>
      </div>

      {flashcards.length === 0 ? (
        <p className="text-gray-400 text-center font-bold mt-10">Nenhum flashcard criado ainda.</p>
      ) : (
        <div className={layout === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6" : "flex flex-col gap-4"}>
          {flashcards.map(card => <FlashcardItem key={card.id} card={card} onDeletar={handleDeletar} />)}
        </div>
      )}
    </div>
  );
}