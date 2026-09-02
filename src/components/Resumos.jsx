import React, { useState } from 'react';
import { useData } from '../context/DataContext';

// Sub-componente que cuida de um único resumo (abrir/fechar)
function ResumoItem({ resumo, onDeletar }) {
  const [expandido, setExpandido] = useState(false);

  return (
    <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-2xl shadow-sm overflow-hidden flex flex-col">
      <div 
        className="p-4 md:p-5 bg-gray-50 dark:bg-gray-700/50 flex justify-between items-center cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition"
        onClick={() => setExpandido(!expandido)}
      >
        <div className="flex flex-col min-w-0 pr-2">
          <span className="text-[10px] font-black text-green-600 dark:text-green-400 uppercase tracking-widest mb-1 truncate">
            {resumo.materia}
          </span>
          <h3 className="font-black text-gray-800 dark:text-white text-base md:text-lg truncate">
            {resumo.titulo}
          </h3>
          <span className="text-[10px] font-bold text-gray-400 mt-1">{resumo.data}</span>
        </div>
        <div className="flex gap-4 items-center shrink-0">
          <button 
            onClick={(e) => { e.stopPropagation(); onDeletar(resumo.id); }} 
            className="text-gray-300 hover:text-red-500 text-lg transition"
          >
            <i className="fa-solid fa-trash"></i>
          </button>
          <i className={`fa-solid fa-chevron-${expandido ? 'up' : 'down'} text-gray-400`}></i>
        </div>
      </div>
      
      {expandido && (
        <div className="p-4 md:p-6 border-t dark:border-gray-700 text-gray-700 dark:text-gray-200 text-sm md:text-base leading-relaxed max-h-[60vh] overflow-y-auto scroll-custom font-medium break-words">
          {/* O React processa quebras de linha com segurança aqui */}
          {resumo.conteudo.split('\n').map((linha, i) => (
            <React.Fragment key={i}>
              {linha}
              <br />
            </React.Fragment>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Resumos() {
  const { dadosEstudo, salvarDados } = useData();
  const [mostrarForm, setMostrarForm] = useState(false);
  
  // Estados para formulário
  const [materia, setMateria] = useState('');
  const [titulo, setTitulo] = useState('');
  const [conteudo, setConteudo] = useState('');

  // Estados para filtro e layout
  const [filtro, setFiltro] = useState('todas');
  const [layout, setLayout] = useState(dadosEstudo.layoutResumos || 'grid');

  const resumos = dadosEstudo.resumos || [];
  const materias = dadosEstudo.materias || [];

  // Filtro instantâneo sem precisar tocar no banco de dados
  const resumosFiltrados = filtro === 'todas' ? resumos : resumos.filter(r => r.materia === filtro);

  async function handleSalvar(e) {
    e.preventDefault();
    if (!materia || !titulo || !conteudo) return alert('Preencha todos os campos!');

    const dataAtual = new Date().toLocaleDateString('pt-BR');
    const novoResumo = { id: Date.now(), materia, titulo, conteudo, data: dataAtual };
    
    await salvarDados({ ...dadosEstudo, resumos: [...resumos, novoResumo] });
    
    setTitulo('');
    setConteudo('');
    setMostrarForm(false);
  }

  async function handleDeletar(id) {
    if (!window.confirm('Excluir este caderno?')) return;
    const novaLista = resumos.filter(r => r.id !== id);
    await salvarDados({ ...dadosEstudo, resumos: novaLista });
  }

  // Salva a preferência visual do usuário no Firebase
  async function mudarLayout(novoLayout) {
    setLayout(novoLayout);
    await salvarDados({ ...dadosEstudo, layoutResumos: novoLayout });
  }

  return (
    <div className="bg-white dark:bg-gray-800 p-4 md:p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 w-full animate-fade-in">
      
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h2 className="text-xl md:text-2xl font-black text-gray-800 dark:text-white">
          <i className="fa-solid fa-book-bookmark text-green-500 mr-2"></i> Meus Cadernos
        </h2>
        <button 
          onClick={() => setMostrarForm(!mostrarForm)} 
          className="w-full md:w-auto bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 font-bold px-4 py-2 rounded-lg border border-green-200 dark:border-green-800 shadow-sm"
        >
          <i className={`fa-solid ${mostrarForm ? 'fa-xmark' : 'fa-plus'} mr-1`}></i> 
          {mostrarForm ? 'Cancelar' : 'Criar Novo Caderno'}
        </button>
      </div>

      {/* Formulário */}
      {mostrarForm && (
        <form onSubmit={handleSalvar} className="bg-gray-50 dark:bg-gray-700/50 p-4 md:p-6 rounded-xl border dark:border-gray-600 mb-6">
          <div className="flex flex-col md:flex-row gap-3 mb-3">
            <select value={materia} onChange={(e) => setMateria(e.target.value)} required className="w-full md:w-1/3 p-2.5 border rounded-lg bg-white dark:bg-gray-800 dark:text-white font-bold outline-none">
              <option value="">Selecione a matéria...</option>
              {materias.map((m, i) => (
                <option key={i} value={m.nome}>{m.nome}</option>
              ))}
            </select>
            <input type="text" placeholder="Título do Resumo" value={titulo} onChange={(e) => setTitulo(e.target.value)} required className="flex-1 p-2.5 border rounded-lg bg-white dark:bg-gray-800 dark:text-white font-bold outline-none" />
          </div>
          <textarea rows="8" placeholder="Digite suas anotações aqui..." value={conteudo} onChange={(e) => setConteudo(e.target.value)} required className="w-full p-4 border rounded-xl bg-white dark:bg-gray-800 dark:text-white outline-none mb-3 resize-none"></textarea>
          <div className="flex justify-end">
            <button type="submit" className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-lg w-full md:w-auto transition">
              Salvar Resumo
            </button>
          </div>
        </form>
      )}

      {/* Barra de Filtros e Layout */}
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-3 bg-gray-50 dark:bg-gray-700/30 p-3 rounded-lg border dark:border-gray-700">
        <select value={filtro} onChange={(e) => setFiltro(e.target.value)} className="w-full sm:w-auto p-2 border rounded-lg bg-white dark:bg-gray-800 dark:text-white text-sm font-bold outline-none">
          <option value="todas">Todas as Matérias</option>
          {materias.map((m, i) => (
            <option key={i} value={m.nome}>{m.nome}</option>
          ))}
        </select>
        
        <div className="flex bg-gray-200 dark:bg-gray-600 rounded-lg p-1 w-full sm:w-auto justify-center">
          <button 
            onClick={() => mudarLayout('grid')} 
            className={`px-4 py-1 rounded text-sm transition ${layout === 'grid' ? 'bg-white dark:bg-gray-700 text-green-600 shadow-sm' : 'text-gray-500'}`}
          >
            <i className="fa-solid fa-border-all"></i>
          </button>
          <button 
            onClick={() => mudarLayout('lista')} 
            className={`px-4 py-1 rounded text-sm transition ${layout === 'lista' ? 'bg-white dark:bg-gray-700 text-green-600 shadow-sm' : 'text-gray-500'}`}
          >
            <i className="fa-solid fa-list"></i>
          </button>
        </div>
      </div>

      {/* Lista/Grid de Resumos */}
      {resumosFiltrados.length === 0 ? (
        <p className="text-gray-400 text-center font-bold mt-10">Nenhum caderno encontrado.</p>
      ) : (
        <div className={layout === 'grid' ? "grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 w-full" : "flex flex-col gap-4 w-full"}>
          {resumosFiltrados.map(resumo => (
            <ResumoItem key={resumo.id} resumo={resumo} onDeletar={handleDeletar} />
          ))}
        </div>
      )}

    </div>
  );
}