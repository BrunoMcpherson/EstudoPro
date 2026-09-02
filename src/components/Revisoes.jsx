import React from 'react';
import { useData } from '../context/DataContext';

export default function Revisoes() {
  const { dadosEstudo, salvarDados } = useData();

  const revisoes = dadosEstudo.revisoes || [];
  const configRevisaoAuto = dadosEstudo.configRevisaoAuto !== false;
  const intervalosRevisao = dadosEstudo.intervalosRevisao || [1, 7, 30];

  async function handleToggleAuto() {
    await salvarDados({ ...dadosEstudo, configRevisaoAuto: !configRevisaoAuto });
  }

  async function handleConcluir(id) {
    const novaLista = revisoes.map(r => r.id === id ? { ...r, concluida: true } : r);
    await salvarDados({ ...dadosEstudo, revisoes: novaLista });
  }

  async function handleExcluir(id) {
    if (!window.confirm("Excluir esta revisão permanentemente?")) return;
    const novaLista = revisoes.filter(r => r.id !== id);
    await salvarDados({ ...dadosEstudo, revisoes: novaLista });
  }

  const revisoesOrdenadas = [...revisoes].sort((a, b) => {
    if (a.concluida === b.concluida) return new Date(a.dataAgendada) - new Date(b.dataAgendada);
    return a.concluida ? 1 : -1;
  });

  const hojeStr = new Date().toISOString().split('T')[0];

  return (
    <div className="bg-white dark:bg-gray-800 p-4 md:p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 w-full animate-fade-in min-h-[500px]">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b dark:border-gray-700 pb-6 mb-6 gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-black text-gray-800 dark:text-white">
            <i className="fa-solid fa-clock-rotate-left text-orange-500 mr-2"></i> Central de Revisões
          </h2>
          <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 mt-1">Gerencie sua repetição espaçada.</p>
        </div>
        
        <div className="flex flex-col w-full md:w-auto items-start md:items-end gap-3 bg-gray-50 dark:bg-gray-700 p-4 rounded-xl border dark:border-gray-600">
          <label className="text-xs md:text-sm font-bold text-gray-700 dark:text-gray-200 flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={configRevisaoAuto} onChange={handleToggleAuto} className="w-4 h-4 text-orange-500 rounded cursor-pointer" /> 
            Agendar Automaticamente
          </label>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] md:text-xs text-gray-500 dark:text-gray-400 font-bold uppercase">Ciclo:</span>
            <select 
              value={intervalosRevisao.join(',')}
              onChange={async (e) => await salvarDados({...dadosEstudo, intervalosRevisao: e.target.value.split(',').map(Number)})}
              className="text-xs font-bold text-orange-600 bg-orange-50 dark:bg-orange-900/30 p-1.5 rounded outline-none border border-orange-200 dark:border-orange-800 cursor-pointer"
            >
              <option value="1,7,30">Concurseiro (1, 7, 30 dias)</option>
              <option value="1,7,16,35">Curva de Ebbinghaus (1, 7, 16, 35)</option>
              <option value="1,3,7,15,30">Intensivo (1, 3, 7, 15, 30)</option>
            </select>
          </div>
        </div>
      </div>

      <div className="flex gap-4 mb-6 font-bold text-xs md:text-sm">
        <span className="text-orange-500 bg-orange-50 dark:bg-orange-900/20 px-3 py-1 rounded-full"><i className="fa-solid fa-circle text-[8px] mr-1"></i> Pendentes</span>
        <span className="text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-1 rounded-full"><i className="fa-solid fa-circle text-[8px] mr-1"></i> Atrasadas</span>
        <span className="text-green-500 bg-green-50 dark:bg-green-900/20 px-3 py-1 rounded-full"><i className="fa-solid fa-circle text-[8px] mr-1"></i> Concluídas</span>
      </div>

      <div className="space-y-3 max-h-[60vh] overflow-y-auto scroll-custom pr-2">
        {revisoesOrdenadas.length === 0 ? (
          <p className="text-gray-400 font-bold text-center mt-10">Tudo em dia! Nenhuma revisão agendada.</p>
        ) : (
          revisoesOrdenadas.map(r => {
            const [ano, mes, dia] = r.dataAgendada.split('-');
            
            let statusHtml;
            let bgCard = 'bg-white dark:bg-gray-800 border dark:border-gray-700';
            let opacity = '';

            if (r.concluida) {
              statusHtml = <span className="text-green-500 font-bold text-[10px] uppercase bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded">Concluída</span>;
              opacity = 'opacity-60';
            } else if (r.dataAgendada < hojeStr) {
              statusHtml = <span className="text-red-500 font-bold text-[10px] uppercase bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded">Atrasada</span>;
              bgCard = 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-900';
            } else {
              statusHtml = <span className="text-orange-500 font-bold text-[10px] uppercase bg-orange-50 dark:bg-orange-900/20 px-2 py-1 rounded">Pendente</span>;
            }

            return (
              <div key={r.id} className={`${bgCard} p-4 md:p-5 rounded-xl shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 ${opacity} transition hover:shadow-md`}>
                <div className="flex flex-col min-w-0">
                  <div className="flex gap-3 items-center mb-2">
                    <p className="text-[10px] md:text-xs text-gray-500 dark:text-gray-400 font-black tracking-widest bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                      <i className="fa-regular fa-calendar mr-1"></i> {dia}/{mes}/{ano}
                    </p>
                    {statusHtml}
                    <span className="text-[10px] font-bold text-gray-400 uppercase border dark:border-gray-600 px-2 py-1 rounded">{r.tipo}</span>
                  </div>
                  <p className="font-black text-gray-800 dark:text-white text-base md:text-lg truncate">{r.materia}</p>
                  <p className="text-gray-600 dark:text-gray-300 text-xs md:text-sm font-medium mt-1 truncate">{r.subtema}</p>
                </div>
                
                <div className="flex gap-2 w-full md:w-auto mt-2 md:mt-0 shrink-0">
                  {!r.concluida ? (
                    <button onClick={() => handleConcluir(r.id)} className="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold px-4 py-2.5 rounded-lg shadow-sm text-sm transition">
                      <i className="fa-solid fa-check mr-1"></i> Concluir
                    </button>
                  ) : (
                    <button disabled className="flex-1 bg-gray-100 dark:bg-gray-700 text-gray-400 font-bold px-4 py-2.5 rounded-lg text-sm cursor-not-allowed">
                      <i className="fa-solid fa-check-double mr-1"></i> Feito
                    </button>
                  )}
                  <button onClick={() => handleExcluir(r.id)} className="bg-gray-100 dark:bg-gray-700 text-gray-400 hover:text-red-500 px-4 py-2.5 rounded-lg shadow-sm transition">
                    <i className="fa-solid fa-trash"></i>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}