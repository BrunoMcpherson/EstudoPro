import React from 'react';
import { useData } from '../context/DataContext';

export default function Calendario() {
  const { dadosEstudo, salvarDados } = useData();

  // Garante que as variáveis existam
  const historicoDias = dadosEstudo.historicoDias || {};
  const historicoEstudos = dadosEstudo.historicoEstudos || [];

  // Lógica do Calendário (Mês Atual)
  const hoje = new Date();
  const anoAtual = hoje.getFullYear();
  const mesAtual = hoje.getMonth(); // 0 = Jan, 11 = Dez
  
  // Nome do mês para o título
  const nomeMesAtual = hoje.toLocaleString('pt-BR', { month: 'long', year: 'numeric' }).toUpperCase();
  
  // Descobre em que dia da semana o mês começa (0 = Domingo) e quantos dias tem no mês
  const primeiroDiaSemana = new Date(anoAtual, mesAtual, 1).getDay();
  const totalDiasMes = new Date(anoAtual, mesAtual + 1, 0).getDate();
  const hojeStr = `${anoAtual}-${String(mesAtual + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`;

  // Funções para limpar o histórico
  async function handleLimparCores() {
    if (!window.confirm("Isso vai limpar os quadradinhos verdes do calendário. Continuar?")) return;
    await salvarDados({ ...dadosEstudo, historicoDias: {} });
  }

  async function handleLimparLista() {
    if (!window.confirm("Apagar toda a lista de sessões de estudo?")) return;
    await salvarDados({ ...dadosEstudo, historicoEstudos: [] });
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6 w-full animate-fade-in h-full">
      
      {/* 1. CALENDÁRIO (QUADRADINHOS) */}
      <div className="bg-white dark:bg-gray-800 p-4 md:p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 w-full lg:w-1/2 overflow-x-auto h-max">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg md:text-xl font-bold text-gray-800 dark:text-white flex items-center">
            <i className="fa-regular fa-calendar-check text-green-500 mr-2"></i> Dias de Estudo
          </h2>
          <div className="flex gap-3 items-center">
            <span className="text-[10px] md:text-xs text-indigo-600 dark:text-indigo-400 font-bold uppercase bg-indigo-50 dark:bg-gray-700 px-3 py-1.5 rounded-lg tracking-widest">
              {nomeMesAtual}
            </span>
            <button onClick={handleLimparCores} className="text-gray-300 dark:text-gray-600 hover:text-red-500 transition p-1" title="Limpar Cores">
              <i className="fa-solid fa-trash"></i>
            </button>
          </div>
        </div>

        <div className="min-w-[280px]">
          {/* Cabeçalho dos dias da semana */}
          <div className="grid grid-cols-7 gap-1 md:gap-2 text-center text-xs md:text-sm font-bold text-gray-400 mb-2">
            <div>D</div><div>S</div><div>T</div><div>Q</div><div>Q</div><div>S</div><div>S</div>
          </div>
          
          {/* Grade do Calendário */}
          <div className="grid grid-cols-7 gap-1 md:gap-2 text-center text-xs md:text-sm font-semibold">
            
            {/* Espaços vazios antes do dia 1 */}
            {Array.from({ length: primeiroDiaSemana }).map((_, i) => (
              <div key={`empty-${i}`} className="p-1 md:p-2"></div>
            ))}
            
            {/* Dias reais do mês */}
            {Array.from({ length: totalDiasMes }).map((_, i) => {
              const dia = i + 1;
              const dataStr = `${anoAtual}-${String(mesAtual + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
              const est = historicoDias[dataStr];
              
              let classes = 'bg-gray-100 dark:bg-gray-700 rounded text-gray-400 dark:text-gray-500 hover:opacity-80 transition cursor-help p-1 md:p-2';
              let title = `${dia}/${mesAtual + 1} - Sem estudos`;

              if (est && (est.minutos > 0 || est.acertos > 0 || est.paginas > 0)) {
                // Dia com estudo! (Verde)
                classes = 'bg-green-500 text-white rounded shadow-sm hover:opacity-80 transition cursor-help p-1 md:p-2';
                title = `${dia}/${mesAtual + 1}: ${est.minutos}min | ${est.acertos + est.erros}q | ${est.paginas}pág`;
              } else if (dataStr === hojeStr) {
                // Dia de hoje (mas ainda sem estudo) - Borda Azulada
                classes = 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-200 rounded border border-indigo-300 dark:border-indigo-700 hover:opacity-80 transition cursor-help p-1 md:p-2';
                title = `Hoje!`;
              }

              return (
                <div key={dia} className={classes} title={title}>
                  {dia}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 2. LISTA DETALHADA DE SESSÕES */}
      <div className="bg-white dark:bg-gray-800 p-4 md:p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col w-full lg:w-1/2 min-h-[400px]">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg md:text-xl font-bold text-gray-800 dark:text-white">
            <i className="fa-solid fa-clock-rotate-left text-indigo-500 mr-2"></i> Histórico Detalhado
          </h2>
          <button onClick={handleLimparLista} className="text-xs text-red-500 hover:underline font-bold transition">
            Limpar Lista
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto scroll-custom space-y-3 pr-2">
          {historicoEstudos.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 mt-10">
              <i className="fa-solid fa-clock-rotate-left text-4xl mb-3 opacity-30"></i>
              <p className="font-bold text-sm">Nenhum estudo registrado.</p>
            </div>
          ) : (
            // Inverte a lista para mostrar os mais recentes no topo
            [...historicoEstudos].sort((a, b) => b.id - a.id).map(item => {
              
              // Define a cor da badge baseado no tipo de estudo
              let corBadge = 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300';
              if (item.tipo === 'Pomodoro') corBadge = 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300';
              if (item.tipo === 'Cronômetro') corBadge = 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300';
              if (item.tipo === 'Manual') corBadge = 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300';

              return (
                <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/30 border dark:border-gray-700 rounded-lg hover:shadow-sm transition">
                  <div className="flex flex-col flex-1 min-w-0 pr-2">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      {item.data} - {item.horario}
                    </span>
                    <span className="font-bold text-gray-800 dark:text-gray-200 text-sm truncate mt-0.5">
                      {item.materia}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-[10px] font-bold px-2 py-1 rounded hidden sm:block uppercase tracking-wider ${corBadge}`}>
                      {item.tipo}
                    </span>
                    <span className="font-black text-indigo-600 dark:text-indigo-400 text-base whitespace-nowrap">
                      {item.duracao} min
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

    </div>
  );
}