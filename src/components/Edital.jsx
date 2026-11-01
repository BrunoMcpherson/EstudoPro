import React, { useState } from 'react';
import { useData } from '../context/DataContext';

export default function Edital() {
  const { dadosEstudo, salvarDados } = useData();
  const [novaMateria, setNovaMateria] = useState('');
  const [materiaAtiva, setMateriaAtiva] = useState(null);
  const [textoTopicos, setTextoTopicos] = useState('');
  const [separador, setSeparador] = useState(','); // Estado do seletor

  const materias = dadosEstudo?.materias || [];

  async function handleAddMateria(e) {
    e.preventDefault();
    if (!novaMateria.trim()) return;
    
    const novaLista = [...materias, { nome: novaMateria.trim(), topicos: [], expandido: true }];
    await salvarDados({ ...dadosEstudo, materias: novaLista });
    setNovaMateria('');
  }

  async function handleAddTopicosMassa(indexMateria) {
    if (!textoTopicos.trim()) return;

    // Lógica inteligente de separação
    let arraySeparado = [];
    if (separador === '\\n') {
      arraySeparado = textoTopicos.split('\n');
    } else {
      arraySeparado = textoTopicos.split(separador);
    }

    const novosTopicos = arraySeparado
      .map(t => t.trim().replace(/\n/g, ' ')) // Remove quebras de linha indesejadas no meio do texto
      .filter(t => t.length > 0)
      .map(t => ({ nome: t, concluido: false }));

    if (novosTopicos.length === 0) return;

    const novaLista = [...materias];
    novaLista[indexMateria].topicos = [...(novaLista[indexMateria].topicos || []), ...novosTopicos];
    
    await salvarDados({ ...dadosEstudo, materias: novaLista });
    setTextoTopicos('');
    setMateriaAtiva(null);
  }

  async function toggleTopico(mIndex, tIndex) {
    const novaLista = [...materias];
    novaLista[mIndex].topicos[tIndex].concluido = !novaLista[mIndex].topicos[tIndex].concluido;
    await salvarDados({ ...dadosEstudo, materias: novaLista });
  }
  
  async function toggleExpandir(mIndex) {
    const novaLista = [...materias];
    novaLista[mIndex].expandido = !novaLista[mIndex].expandido;
    await salvarDados({ ...dadosEstudo, materias: novaLista });
  }

  async function removerMateria(mIndex) {
    if(!window.confirm("Apagar matéria e todos os tópicos?")) return;
    const novaLista = materias.filter((_, i) => i !== mIndex);
    await salvarDados({ ...dadosEstudo, materias: novaLista });
  }

  async function removerTopico(mIndex, tIndex) {
    const novaLista = [...materias];
    novaLista[mIndex].topicos = novaLista[mIndex].topicos.filter((_, i) => i !== tIndex);
    await salvarDados({ ...dadosEstudo, materias: novaLista });
  }

  return (
    <div className="space-y-6 animate-fade-in">
      
      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border dark:border-gray-700">
        <h2 className="text-xl font-black mb-4">Adicionar Nova Matéria</h2>
        <form onSubmit={handleAddMateria} className="flex gap-3">
          <input 
            type="text" 
            value={novaMateria} 
            onChange={e => setNovaMateria(e.target.value)} 
            placeholder="Ex: Direito Constitucional" 
            className="flex-1 p-3 border rounded-xl bg-gray-50 dark:bg-gray-700 dark:text-white dark:border-gray-600 outline-none font-bold"
          />
          <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-black transition shadow">
            Adicionar
          </button>
        </form>
      </div>

      <div className="space-y-4">
        {materias.map((materia, mIndex) => {
          const topicos = materia.topicos || [];
          const concluidos = topicos.filter(t => t.concluido).length;
          const progresso = topicos.length > 0 ? Math.round((concluidos / topicos.length) * 100) : 0;

          return (
            <div key={mIndex} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border dark:border-gray-700 overflow-hidden">
              <div className="p-4 flex items-center justify-between bg-gray-50 dark:bg-gray-750 border-b dark:border-gray-700 cursor-pointer" onClick={() => toggleExpandir(mIndex)}>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <button className="text-gray-400 hover:text-indigo-500 w-6">
                      <i className={`fa-solid ${materia.expandido ? 'fa-chevron-down' : 'fa-chevron-right'}`}></i>
                    </button>
                    <h3 className="font-black text-lg text-gray-800 dark:text-white">{materia.nome}</h3>
                    <span className="text-xs font-bold text-gray-500 bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded-lg">
                      {concluidos}/{topicos.length}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 h-2 rounded-full overflow-hidden">
                    <div className="bg-indigo-500 h-full transition-all duration-500" style={{ width: `${progresso}%` }}></div>
                  </div>
                </div>
                <button onClick={(e) => { e.stopPropagation(); removerMateria(mIndex); }} className="ml-4 text-red-400 hover:text-red-600 p-2">
                  <i className="fa-solid fa-trash"></i>
                </button>
              </div>

              {materia.expandido && (
                <div className="p-4 space-y-4">
                  {materiaAtiva === mIndex ? (
                    <div className="bg-indigo-50 dark:bg-gray-700 p-4 rounded-xl border border-indigo-100 dark:border-gray-600">
                      
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-3">
                        <label className="text-xs font-bold text-indigo-800 dark:text-indigo-200 uppercase">Cole o texto do edital aqui</label>
                        
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-gray-500 dark:text-gray-400">Separar por:</span>
                          <select 
                            value={separador} 
                            onChange={e => setSeparador(e.target.value)}
                            className="p-1.5 text-xs font-bold border rounded-lg bg-white dark:bg-gray-800 dark:text-white dark:border-gray-600 outline-none cursor-pointer"
                          >
                            <option value=",">Vírgula ( , )</option>
                            <option value=";">Ponto e Vírgula ( ; )</option>
                            <option value=".">Ponto Final ( . )</option>
                            <option value="/">Barra ( / )</option>
                            <option value="\">Barra Invertida ( \ )</option>
                            <option value=":">Dois Pontos ( : )</option>
                            <option value="\n">Quebra de Linha (Enter)</option>
                          </select>
                        </div>
                      </div>
                      
                      <textarea 
                        value={textoTopicos} 
                        onChange={e => setTextoTopicos(e.target.value)} 
                        placeholder="Exemplo 1, Exemplo 2..." 
                        className="w-full p-3 border rounded-xl bg-white dark:bg-gray-800 dark:text-white dark:border-gray-600 outline-none font-medium text-sm h-32 mb-3 resize-none scroll-custom"
                      ></textarea>
                      
                      <div className="flex gap-2 justify-end">
                        <button onClick={() => { setMateriaAtiva(null); setTextoTopicos(''); }} className="px-4 py-2 font-bold text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                          Cancelar
                        </button>
                        <button onClick={() => handleAddTopicosMassa(mIndex)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-xl font-black shadow transition">
                          Salvar Tópicos
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => setMateriaAtiva(mIndex)} className="w-full p-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl text-gray-500 dark:text-gray-400 font-bold hover:border-indigo-500 hover:text-indigo-500 transition flex items-center justify-center gap-2">
                      <i className="fa-solid fa-plus"></i> Adicionar Tópicos em Massa
                    </button>
                  )}

                  <div className="space-y-2 mt-4">
                    {topicos.map((topico, tIndex) => (
                      <div key={tIndex} className={`flex items-start gap-3 p-3 rounded-lg border transition ${topico.concluido ? 'bg-green-50/50 border-green-200 dark:bg-green-900/20 dark:border-green-800' : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700'}`}>
                        <button onClick={() => toggleTopico(mIndex, tIndex)} className={`mt-0.5 shrink-0 w-5 h-5 rounded border flex items-center justify-center transition ${topico.concluido ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 dark:border-gray-600 hover:border-indigo-500'}`}>
                          {topico.concluido && <i className="fa-solid fa-check text-xs"></i>}
                        </button>
                        <span className={`flex-1 text-sm font-medium ${topico.concluido ? 'text-gray-400 line-through' : 'text-gray-700 dark:text-gray-200'}`}>
                          {topico.nome}
                        </span>
                        <button onClick={() => removerTopico(mIndex, tIndex)} className="text-gray-300 hover:text-red-500 transition">
                          <i className="fa-solid fa-xmark"></i>
                        </button>
                      </div>
                    ))}
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