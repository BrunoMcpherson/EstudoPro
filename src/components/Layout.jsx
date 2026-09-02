import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';

import Dashboard from './Dashboard';
import Calendario from './Calendario';
import Pdfs from './Pdfs';
import Revisoes from './Revisoes';
import Desempenho from './Desempenho';
import Edital from './Edital';
import Resumos from './Resumos';
import Flashcards from './Flashcards';

export default function Layout() {
  const { currentUser, logout } = useAuth();
  const { dadosEstudo, salvarDados } = useData();
  const [abaAtiva, setAbaAtiva] = useState('dashboard');
  const [sidebarAberta, setSidebarAberta] = useState(true);

  // Ativação do Dark Mode no HTML
  useEffect(() => {
    if (dadosEstudo?.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [dadosEstudo?.darkMode]);

  const menuItems = [
    { id: 'dashboard', icon: 'fa-chart-pie', label: 'Dashboard' },
    { id: 'calendario', icon: 'fa-calendar-days', label: 'Histórico' },
    { id: 'pdfs', icon: 'fa-file-pdf', label: 'Meus PDFs' },
    { id: 'revisoes', icon: 'fa-clock-rotate-left', label: 'Revisões' },
    { id: 'desempenho', icon: 'fa-chart-line', label: 'Desempenho' },
    { id: 'edital', icon: 'fa-list-check', label: 'Meu Edital' },
    { id: 'resumos', icon: 'fa-book-bookmark', label: 'Resumos' },
    { id: 'flashcards', icon: 'fa-clone', label: 'Flashcards' },
  ];

  const renderizarTela = () => {
    switch (abaAtiva) {
      case 'dashboard': return <Dashboard />;
      case 'calendario': return <Calendario />;
      case 'pdfs': return <Pdfs />;
      case 'revisoes': return <Revisoes />;
      case 'desempenho': return <Desempenho />;
      case 'edital': return <Edital />;
      case 'resumos': return <Resumos />;
      case 'flashcards': return <Flashcards />;
      default:
        return (
          <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 text-center flex flex-col items-center justify-center h-full min-h-[400px] animate-fade-in">
            <i className={`fa-solid ${menuItems.find(m => m.id === abaAtiva)?.icon} text-6xl text-indigo-200 dark:text-indigo-900/50 mb-6`}></i>
            <h2 className="text-3xl font-black text-indigo-600 dark:text-indigo-400 mb-2">
              Aba: {menuItems.find(m => m.id === abaAtiva)?.label}
            </h2>
            <p className="text-gray-500 dark:text-gray-400 font-medium">Estamos migrando esta tela para o formato React...</p>
          </div>
        );
    }
  };

  return (
    <div className="flex h-screen w-full bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-100 font-sans overflow-hidden transition-colors duration-300">
      
      <aside className={`bg-white dark:bg-gray-800 shadow-xl border-r dark:border-gray-700 flex flex-col transition-all duration-300 ${sidebarAberta ? 'w-64' : 'w-16'}`}>
        <div className="h-16 flex items-center justify-center border-b dark:border-gray-700 px-4">
          <i className="fa-solid fa-graduation-cap text-indigo-600 dark:text-indigo-400 text-2xl"></i>
          {sidebarAberta && <h1 className="text-2xl font-black ml-2 text-gray-800 dark:text-white">EstudoPro</h1>}
        </div>
        
        <nav className="flex-1 overflow-y-auto py-4 space-y-2 px-2 scroll-custom">
          {menuItems.map(item => (
            <button
              key={item.id}
              onClick={() => setAbaAtiva(item.id)}
              className={`w-full flex items-center px-3 py-3 rounded-lg font-bold transition-colors ${
                abaAtiva === item.id 
                  ? 'bg-indigo-100 text-indigo-700 border-r-4 border-indigo-600 dark:bg-gray-700 dark:text-indigo-400' 
                  : 'text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700'
              }`}
            >
              <i className={`fa-solid ${item.icon} text-lg w-6 text-center shrink-0`}></i>
              {sidebarAberta && <span className="ml-2 whitespace-nowrap">{item.label}</span>}
            </button>
          ))}
        </nav>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <header className="h-16 flex items-center justify-between px-4 md:px-6 bg-white/80 dark:bg-gray-800/80 backdrop-blur border-b dark:border-gray-700 z-10 shadow-sm shrink-0">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarAberta(!sidebarAberta)} className="text-gray-500 hover:text-indigo-600 dark:text-gray-400 transition">
              <i className="fa-solid fa-bars text-xl"></i>
            </button>
            <div className="font-bold text-gray-600 dark:text-gray-300 hidden sm:block uppercase">
              {menuItems.find(m => m.id === abaAtiva)?.label}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => salvarDados({...dadosEstudo, darkMode: !dadosEstudo.darkMode})} 
              className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-yellow-400 w-10 h-10 rounded-full font-bold transition hover:bg-gray-200 dark:hover:bg-gray-600"
              title="Alternar Tema"
            >
              <i className={`fa-solid ${dadosEstudo?.darkMode ? 'fa-sun' : 'fa-moon'}`}></i>
            </button>
            <div className="bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200 px-3 py-1.5 rounded-lg font-bold text-xs shadow-sm flex items-center gap-2">
              <i className="fa-solid fa-cloud-check text-green-500"></i> 
              <span className="hidden sm:block">Logado: {currentUser?.email}</span>
            </div>
            <button onClick={logout} className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 w-10 h-10 rounded-full flex items-center justify-center font-bold transition">
              <i className="fa-solid fa-right-from-bracket"></i>
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6 scroll-custom relative bg-gray-50 dark:bg-gray-900">
          {renderizarTela()}
        </main>
      </div>
    </div>
  );
}