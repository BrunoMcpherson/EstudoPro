import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import {
  Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale,
  BarElement, PointElement, LineElement, Title, Filler
} from 'chart.js';
import { Doughnut, Bar, Line } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Filler);

export default function Desempenho() {
  const { dadosEstudo, salvarDados } = useData();
  const [materiaSelecionada, setMateriaSelecionada] = useState('');
  const [acertos, setAcertos] = useState('');
  const [erros, setErros] = useState('');

  const materias = dadosEstudo.materias || [];
  const historicoDias = dadosEstudo.historicoDias || {};
  const qGerais = dadosEstudo.questoesGerais || { acertos: 0, erros: 0 };
  const totalQ = qGerais.acertos + qGerais.erros;

  const textColor = dadosEstudo.darkMode ? '#9ca3af' : '#6b7280';
  const gridColor = dadosEstudo.darkMode ? '#374151' : '#e5e7eb';

  function formatarHorasMinutos(totalMinutos) {
    const h = Math.floor(totalMinutos / 60);
    const m = totalMinutos % 60;
    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
  }

  async function handleSalvarQuestoes() {
    const ac = parseInt(acertos) || 0;
    const er = parseInt(erros) || 0;
    
    if (materiaSelecionada === "" || (ac === 0 && er === 0)) {
      return alert("Selecione a matéria e insira valores válidos.");
    }

    const novaListaMaterias = JSON.parse(JSON.stringify(materias));
    const matIndex = novaListaMaterias.findIndex(m => m.nome === materiaSelecionada);
    
    if (matIndex !== -1) {
      if (!novaListaMaterias[matIndex].questoes) novaListaMaterias[matIndex].questoes = { acertos: 0, erros: 0 };
      novaListaMaterias[matIndex].questoes.acertos += ac;
      novaListaMaterias[matIndex].questoes.erros += er;
    }

    const novasQuestoesGerais = {
      acertos: qGerais.acertos + ac,
      erros: qGerais.erros + er
    };

    const hojeStr = new Date().toISOString().split('T')[0];
    const novoHistoricoDias = { ...historicoDias };
    if (!novoHistoricoDias[hojeStr]) novoHistoricoDias[hojeStr] = { minutos: 0, acertos: 0, erros: 0, paginas: 0 };
    novoHistoricoDias[hojeStr].acertos += ac;
    novoHistoricoDias[hojeStr].erros += er;

    await salvarDados({ 
      ...dadosEstudo, 
      materias: novaListaMaterias, 
      questoesGerais: novasQuestoesGerais,
      historicoDias: novoHistoricoDias 
    });

    setAcertos('');
    setErros('');
  }

  async function handleZerarMateria(nomeMateria) {
    if(!window.confirm(`Deseja zerar as questões de ${nomeMateria}?`)) return;
    
    const novaListaMaterias = JSON.parse(JSON.stringify(materias));
    const matIndex = novaListaMaterias.findIndex(m => m.nome === nomeMateria);
    
    if (matIndex !== -1) {
      const q = novaListaMaterias[matIndex].questoes || { acertos: 0, erros: 0 };
      const novasQuestoesGerais = {
        acertos: Math.max(0, qGerais.acertos - q.acertos),
        erros: Math.max(0, qGerais.erros - q.erros)
      };
      novaListaMaterias[matIndex].questoes = { acertos: 0, erros: 0 };
      
      await salvarDados({ ...dadosEstudo, materias: novaListaMaterias, questoesGerais: novasQuestoesGerais });
    }
  }

  const dataGeral = {
    labels: totalQ > 0 ? ['Acertos', 'Erros'] : ['Sem Dados'],
    datasets: [{
      data: totalQ > 0 ? [qGerais.acertos, qGerais.erros] : [1],
      backgroundColor: totalQ > 0 ? ['#10b981', '#ef4444'] : ['#e5e7eb'],
      borderWidth: 0
    }]
  };

  const matNomes = []; const matAprov = []; const matCores = []; const matTempo = [];
  materias.forEach(m => {
    const nomeCurto = m.nome.length > 15 ? m.nome.substring(0, 15) + '...' : m.nome;
    const q = m.questoes || { acertos: 0, erros: 0 };
    const totM = q.acertos + q.erros;
    if (totM > 0) {
      const pct = Math.round((q.acertos / totM) * 100);
      matNomes.push(nomeCurto);
      matAprov.push(pct);
      matCores.push(pct >= 80 ? '#10b981' : (pct >= 60 ? '#f59e0b' : '#ef4444'));
    }
    if (m.tempo > 0) {
      if(!matNomes.includes(nomeCurto)) matNomes.push(nomeCurto);
      matTempo.push(m.tempo);
    }
  });

  const dataAproveitamento = {
    labels: matAprov.length > 0 ? matNomes : ['-'],
    datasets: [{
      label: 'Aproveitamento (%)',
      data: matAprov.length > 0 ? matAprov : [0],
      backgroundColor: matAprov.length > 0 ? matCores : ['#374151'],
      borderRadius: 6
    }]
  };

  const dataTempo = {
    labels: matTempo.length > 0 ? matNomes : ['-'],
    datasets: [{
      label: 'Tempo (min)',
      data: matTempo.length > 0 ? matTempo : [0],
      backgroundColor: '#4f46e5',
      borderRadius: 6
    }]
  };

  const evoLabels = []; const evoMin = []; const evoQtd = [];
  for(let i = 6; i >= 0; i--) {
    let d = new Date(); d.setDate(d.getDate() - i);
    let dStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    evoLabels.push(`${d.getDate()}/${d.getMonth()+1}`);
    let h = historicoDias[dStr] || { minutos:0, acertos:0, erros:0 };
    evoMin.push(h.minutos);
    evoQtd.push(h.acertos + h.erros);
  }

  const dataEvolucao = {
    labels: evoLabels,
    datasets: [
      { label: 'Minutos', data: evoMin, borderColor: '#4f46e5', backgroundColor: 'rgba(79, 70, 229, 0.1)', fill: true, tension: 0.4 },
      { label: 'Questões', data: evoQtd, borderColor: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.1)', fill: true, tension: 0.4 }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: { beginAtZero: true, grid: { color: gridColor }, ticks: { color: textColor } },
      x: { grid: { color: gridColor }, ticks: { color: textColor } }
    },
    plugins: { legend: { display: false } }
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-4 md:p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 w-full animate-fade-in">
      <h2 className="text-xl md:text-2xl font-black text-gray-800 dark:text-white mb-6">
        <i className="fa-solid fa-chart-line text-blue-500 mr-2"></i> Desempenho e Estatísticas
      </h2>

      <div className="bg-blue-50 dark:bg-blue-900/10 p-4 md:p-6 rounded-xl border border-blue-100 dark:border-gray-700 mb-8 flex flex-col md:flex-row gap-4 items-end">
        <div className="w-full md:flex-1 min-w-0">
          <label className="text-[10px] md:text-xs font-bold text-blue-800 dark:text-blue-300 uppercase mb-1 block">Matéria</label>
          <select value={materiaSelecionada} onChange={e => setMateriaSelecionada(e.target.value)} className="w-full p-3 border rounded-lg bg-white dark:bg-gray-700 font-bold outline-none dark:text-white">
            <option value="">Selecione...</option>
            {materias.map((m, i) => <option key={i} value={m.nome}>{m.nome}</option>)}
          </select>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <div className="flex-1 md:w-24">
            <label className="text-[10px] md:text-xs font-bold text-green-700 uppercase mb-1 block">Acertos</label>
            <input type="number" value={acertos} onChange={e => setAcertos(e.target.value)} placeholder="0" min="0" className="w-full p-3 border border-green-300 rounded-lg text-green-700 dark:bg-gray-700 font-black text-center outline-none" />
          </div>
          <div className="flex-1 md:w-24">
            <label className="text-[10px] md:text-xs font-bold text-red-700 uppercase mb-1 block">Erros</label>
            <input type="number" value={erros} onChange={e => setErros(e.target.value)} placeholder="0" min="0" className="w-full p-3 border border-red-300 rounded-lg text-red-700 dark:bg-gray-700 font-black text-center outline-none" />
          </div>
        </div>
        <button onClick={handleSalvarQuestoes} className="w-full md:w-auto bg-blue-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-blue-700 transition shadow-md">
          Registrar
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl border dark:border-gray-600 h-64 flex flex-col items-center">
          <h3 className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">Visão Geral</h3>
          <div className="w-full h-full pb-4 relative"><Doughnut data={dataGeral} options={{ maintainAspectRatio: false, cutout: '70%', plugins: { legend: { display: false } } }} /></div>
        </div>
        <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl border dark:border-gray-600 h-64">
          <h3 className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide text-center">Aproveitamento (%)</h3>
          <div className="w-full h-full pb-4"><Bar data={dataAproveitamento} options={chartOptions} /></div>
        </div>
        <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl border dark:border-gray-600 h-64">
        <h3 className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide text-center">Evolução (Últimos 7 dias)</h3>
        <div className="w-full h-full pb-4">
            <Line 
            data={dataEvolucao} 
            options={{ 
                ...chartOptions, 
                plugins: { 
                legend: { display: true, labels: { color: textColor } },
                tooltip: {
                    callbacks: {
                    label: (context) => {
                        // Se o dataset avaliado for o de minutos (dataset índice 0)
                        if (context.datasetIndex === 0) {
                        return ` Minutos: ${formatarHorasMinutos(context.raw)}`;
                        }
                        // Caso contrário (ex: Questões), exibe o número normal
                        return ` Questões: ${context.raw}`;
                    }
                    }
                }
                } 
            }} 
            />
        </div>
        </div>
        <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl border dark:border-gray-600 h-64">
          <h3 className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide text-center">Tempo por Matéria</h3>
          <div className="w-full h-full pb-4">
            <Bar 
              data={dataTempo} 
              options={{
                ...chartOptions,
                plugins: {
                  ...chartOptions.plugins,
                  tooltip: {
                    callbacks: {
                      label: (context) => ` Tempo: ${formatarHorasMinutos(context.raw)}`
                    }
                  }
                }
              }} 
            />
          </div>
        </div>
      </div>

      <div className="mt-6 border-t dark:border-gray-700 pt-6 overflow-x-auto w-full">
        <div className="min-w-[500px]">
          <table className="w-full text-sm text-left">
            <thead className="text-gray-500 dark:text-gray-400 uppercase font-black text-xs border-b-2 dark:border-gray-700">
              <tr>
                <th className="pb-3 px-2">Matéria</th>
                <th className="pb-3 text-center">Tempo</th>
                <th className="pb-3 text-center">Questões Feitas</th>
                <th className="pb-3 text-center text-green-500">Acertos</th>
                <th className="pb-3 text-center text-red-500">Erros</th>
                <th className="pb-3 text-right px-2">%</th>
                <th className="pb-3 text-center px-2">Ação</th>
              </tr>
            </thead>
            <tbody>
              {materias.length === 0 && <tr><td colSpan="7" className="text-center py-4 text-gray-400 font-bold">Sem dados</td></tr>}
              {materias.map((m, i) => {
                const q = m.questoes || { acertos: 0, erros: 0 };
                const totM = q.acertos + q.erros;
                const pct = totM === 0 ? 0 : Math.round((q.acertos / totM) * 100);
                const pctColor = pct >= 80 ? 'text-green-600' : (pct >= 60 ? 'text-yellow-600' : 'text-red-500');
                const tempoFormatado = formatarHorasMinutos(m.tempo || 0);

                return (
                  <tr key={i} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition">
                    <td className="py-4 px-2 font-black text-gray-700 dark:text-gray-200">{m.nome}</td>
                    <td className="py-4 text-center font-bold text-indigo-600 dark:text-indigo-400">{tempoFormatado}</td>
                    <td className="py-4 text-center text-gray-500 font-bold">{totM}</td>
                    <td className="py-4 text-center font-black text-green-600">{q.acertos}</td>
                    <td className="py-4 text-center font-black text-red-500">{q.erros}</td>
                    <td className={`py-4 text-right px-2 font-black text-sm ${pctColor}`}>{pct}%</td>
                    <td className="py-4 text-center px-2">
                      <button onClick={() => handleZerarMateria(m.nome)} className="text-gray-400 hover:text-indigo-500 transition" title="Zerar">
                        <i className="fa-solid fa-rotate-left"></i>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}