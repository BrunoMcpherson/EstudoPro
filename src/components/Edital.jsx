import React, { useState } from 'react';
import { useData } from '../context/DataContext';

export default function Edital() {
  const { dadosEstudo, salvarDados } = useData();
  const [novaMateria, setNovaMateria] = useState('');
  const [topicosTexto, setTopicosTexto] = useState('');
  
  const [expandidos, setExpandidos] = useState(dadosEstudo.editalExpandidos || {});
  const materias = dadosEstudo.materias || [];

  async function toggleExpandir(index) {
    const novoEstado = { ...expandidos, [index]: expandidos[index] === undefined ? false : !expandidos[index] };
    setExpandidos(novoEstado);
    await salvarDados({ ...dadosEstudo, editalExpandidos: novoEstado });
  }

  async function handleAddMateria(e) {
    e.preventDefault();
    if (!novaMateria) return alert('Digite o nome da matéria!');

    const linhas = topicosTexto.split(/[\n,]+/).map(l => l.trim()).filter(l => l !== "");
    const subtemas = linhas.map(l => ({ nome: l, concluido: false }));

    const novaLista = [...materias, {
      nome: novaMateria,
      subtemas,
      questoes: { acertos: 0, erros: 0 },
      tempo: 0
    }];

    await salvarDados({ ...dadosEstudo, materias: novaLista });
    setNovaMateria('');
    setTopicosTexto('');
  }

  async function handleToggleSubtema(materiaIndex, subtemaIndex) {
    const novaLista = JSON.parse(JSON.stringify(materias));
    const sub = novaLista[materiaIndex].subtemas[subtemaIndex];
    sub.concluido = !sub.concluido;
    await salvarDados({ ...dadosEstudo, materias: novaLista });
  }

  async function handleDeletarMateria(index) {
    if (!window.confirm("Excluir matéria e todo seu histórico?")) return;
    const novaLista = materias.filter((_, i) => i !== index);
    await salvarDados({ ...dadosEstudo, materias: novaLista });
  }

  async function handleDeletarSubtema(materiaIndex, subtemaIndex) {
    if (!window.confirm("Excluir este tópico específico?")) return;
    const novaLista = JSON.parse(JSON.stringify(materias));
    novaLista[materiaIndex].subtemas.splice(subtemaIndex, 1);
    await salvarDados({ ...dadosEstudo, materias: novaLista });
  }

  return (
    <div className="bg-white dark:bg-gray-800 p-4 md:p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 w-full animate-fade-in">
      <h2 className="text-xl md:text-2xl font-black text-gray-800 dark:text-white mb-6">
        <i className="fa-solid fa-list-check text-indigo-500 mr-2"></i> Estrutura do Edital
      </h2>

      <form onSubmit={handleAddMateria} className="bg-indigo-50 dark:bg-gray-700 p-4 md:p-6 rounded-2xl border border-indigo-100 dark:border-gray-600 mb-8">
        <p className="text-[10px] md:text-sm font-black text-indigo-800 dark:text-indigo-300 mb-3 uppercase tracking-wide">
          Cadastrar Matéria e Tópicos
        </p>
        <div className="flex flex-col md:flex-row gap-3">
          <input type="text" placeholder="Matéria (Ex: Direito Penal)" value={novaMateria} onChange={(e) => setNovaMateria(e.target.value)} className="w-full md:w-1/3 p-3 border rounded-lg outline-none bg-white dark:bg-gray-800 dark:text-white font-bold focus:ring-2 focus:ring-indigo-500" />
          <input type="text" placeholder="Tópicos separados por vírgula..." value={topicosTexto} onChange={(e) => setTopicosTexto(e.target.value)} className="w-full md:w-2/3 p-3 border rounded-lg outline-none bg-white dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-indigo-500" />
          <button type="submit" className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-black hover:bg-indigo-700 transition">Add</button>
        </div>
      </form>

      <div className="space-y-6">
        {materias.length === 0 && <p className="text-center font-bold text-gray-400">Nenhuma matéria cadastrada.</p>}
        
        {materias.map((mat, iMat) => {
          const subtemas = mat.subtemas || [];
          const concluidos = subtemas.filter(s => s.concluido).length;
          const porcentagem = subtemas.length === 0 ? 0 : Math.round((concluidos / subtemas.length) * 100);
          const horas = Math.floor((mat.tempo || 0) / 60);
          const minutos = (mat.tempo || 0) % 60;
          const tempoFormatado = mat.tempo ? (horas > 0 ? `${horas}h ` : '') + `${minutos}m` : '0m';
          
          const isExpandido = expandidos[iMat] === undefined ? true : expandidos[iMat];

          return (
            <div key={iMat} className="border dark:border-gray-700 rounded-2xl p-4 md:p-6 bg-white dark:bg-gray-800 shadow-sm border-l-[6px] border-l-indigo-500 transition-all">
              <div className="flex justify-between items-center mb-4 gap-2">
                <div className="flex-1 cursor-pointer flex items-center gap-3" onClick={() => toggleExpandir(iMat)}>
                  <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex justify-center items-center shrink-0">
                    <i className={`fa-solid ${isExpandido ? 'fa-chevron-up' : 'fa-chevron-down'} text-gray-500 text-xs`}></i>
                  </div>
                  <h3 className="font-black text-lg md:text-xl text-gray-800 dark:text-white truncate">{mat.nome}</h3>
                  <span className="hidden sm:flex text-xs font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-900/50 px-3 py-1 rounded-full uppercase items-center">
                    <i className="fa-solid fa-clock mr-1"></i> {tempoFormatado}
                  </span>
                </div>
                <button onClick={() => handleDeletarMateria(iMat)} className="text-gray-400 hover:text-red-500 bg-gray-50 dark:bg-gray-700 w-10 h-10 rounded-full flex justify-center items-center transition">
                  <i className="fa-solid fa-trash text-sm"></i>
                </button>
              </div>

              <div className="flex items-center gap-3 mb-2">
                <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-3">
                  <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 h-3 rounded-full transition-all duration-500" style={{ width: `${porcentagem}%` }}></div>
                </div>
                <span className="text-sm font-black text-indigo-600 dark:text-indigo-400 w-10 text-right">{porcentagem}%</span>
              </div>

              {isExpandido && (
                <div className="mt-4 border-t dark:border-gray-700 pt-4">
                  <div className="max-h-64 overflow-y-auto scroll-custom border-l-2 border-gray-100 dark:border-gray-700 ml-4 pl-2 space-y-1">
                    {subtemas.map((sub, iSub) => (
                      <div key={iSub} className="flex justify-between items-center p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg group transition">
                        <label className="flex items-center gap-3 flex-1 cursor-pointer">
                          <input type="checkbox" checked={sub.concluido} onChange={() => handleToggleSubtema(iMat, iSub)} className="w-5 h-5 text-indigo-600 rounded cursor-pointer border-gray-300" />
                          <span className={`font-medium text-sm md:text-base transition-all ${sub.concluido ? 'line-through text-gray-400' : 'text-gray-700 dark:text-gray-200'}`}>{sub.nome}</span>
                        </label>
                        <button onClick={() => handleDeletarSubtema(iMat, iSub)} className="text-gray-300 hover:text-red-500 px-2 opacity-0 group-hover:opacity-100 transition"><i className="fa-solid fa-trash"></i></button>
                      </div>
                    ))}
                    {subtemas.length === 0 && <p className="text-xs text-gray-400 italic">Nenhum tópico cadastrado.</p>}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}