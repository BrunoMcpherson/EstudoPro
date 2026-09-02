import React, { useState, useEffect } from 'react';
import { useData } from '../context/DataContext';

export default function Dashboard() {
  const { dadosEstudo, loadingData, salvarDados } = useData();
  
  const [mostrarForm, setMostrarForm] = useState(false);
  const [nomeProva, setNomeProva] = useState('');
  const [dataProva, setDataProva] = useState('');

  const [abaTempo, setAbaTempo] = useState('pomodoro');
  const [materiaSelecionada, setMateriaSelecionada] = useState('');
  
  const [minutosFoco, setMinutosFoco] = useState(25);
  const [minutosPausa, setMinutosPausa] = useState(5);
  const [tempo, setTempo] = useState(25 * 60);
  const [rodando, setRodando] = useState(false);
  const [modoDescanso, setModoDescanso] = useState(false);
  
  // Estados para inserção manual em Horas e Minutos separados
  const [horasManuais, setHorasManuais] = useState('');
  const [minutosManuais, setMinutosManuais] = useState('');

  const materias = dadosEstudo?.materias || [];

  useEffect(() => {
    let intervalo = null;
    if (rodando) {
      intervalo = setInterval(() => {
        setTempo((t) => {
          if (abaTempo === 'pomodoro') {
            if (t <= 1) {
              setRodando(false);
              if (!modoDescanso) {
                finalizarSessao(minutosFoco, 'Pomodoro');
                alert("Foco concluído! Hora de descansar.");
                setModoDescanso(true);
                return minutosPausa * 60;
              } else {
                setModoDescanso(false);
                return minutosFoco * 60;
              }
            }
            return t - 1;
          } else {
            return t + 1;
          }
        });
      }, 1000);
    }
    return () => clearInterval(intervalo);
  }, [rodando, abaTempo, modoDescanso, minutosFoco, minutosPausa, materiaSelecionada]);

  if (loadingData) return <div className="text-center font-bold text-gray-400 mt-20">Carregando...</div>;
  if (!dadosEstudo) return <div className="text-center text-red-500 mt-20">Erro ao carregar dados.</div>;

  const concurso = dadosEstudo.concursos?.[0] || null;
  let diasRestantes = null;
  if (concurso?.data) {
    const hoje = new Date(); hoje.setHours(0,0,0,0);
    const prova = new Date(concurso.data); prova.setHours(24,0,0,0);
    diasRestantes = Math.ceil((prova - hoje) / (1000 * 60 * 60 * 24));
  }

  const horasTotais = Math.floor((dadosEstudo.tempoTotal || 0) / 60);
  const minutosTotais = (dadosEstudo.tempoTotal || 0) % 60;
  const totQ = (dadosEstudo.questoesGerais?.acertos || 0) + (dadosEstudo.questoesGerais?.erros || 0);

  async function handleSalvarProva(e) {
    e.preventDefault();
    await salvarDados({ ...dadosEstudo, concursos: [{ nome: nomeProva, data: dataProva }] });
    setMostrarForm(false);
  }

  async function zerar(campo, subcampo = null) {
    if (!window.confirm("Zerar este card permanentemente?")) return;
    if (subcampo) {
      await salvarDados({ ...dadosEstudo, [campo]: { ...dadosEstudo[campo], [subcampo]: 0, erros: 0 } });
    } else {
      await salvarDados({ ...dadosEstudo, [campo]: 0 });
    }
  }

  function verificarMatéria() {
    if (!materiaSelecionada) {
      alert("Por favor, selecione uma matéria antes de iniciar o estudo!");
      return false;
    }
    return true;
  }

  async function finalizarSessao(minutosGanhos, tipoRegistro) {
    if (!materiaSelecionada || minutosGanhos <= 0) return;

    const hoje = new Date();
    const hojeStr = hoje.toISOString().split('T')[0];
    const horarioStr = hoje.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    const novaListaMaterias = JSON.parse(JSON.stringify(materias));
    const matIndex = novaListaMaterias.findIndex(m => m.nome === materiaSelecionada);
    if (matIndex !== -1) novaListaMaterias[matIndex].tempo = (novaListaMaterias[matIndex].tempo || 0) + minutosGanhos;

    const novoHistoricoEstudos = [
      { id: Date.now(), data: hoje.toLocaleDateString('pt-BR'), horario: horarioStr, materia: materiaSelecionada, tipo: tipoRegistro, duracao: minutosGanhos },
      ...(dadosEstudo.historicoEstudos || [])
    ];

    const novoHistoricoDias = { ...(dadosEstudo.historicoDias || {}) };
    if (!novoHistoricoDias[hojeStr]) novoHistoricoDias[hojeStr] = { minutos: 0, acertos: 0, erros: 0, paginas: 0 };
    novoHistoricoDias[hojeStr].minutos += minutosGanhos;

    let novaOfensiva = { ...(dadosEstudo.ofensiva || { dias: 0, ultimaData: null }) };
    if (novaOfensiva.ultimaData !== hojeStr) {
      const ontem = new Date(); ontem.setDate(ontem.getDate() - 1);
      const ontemStr = ontem.toISOString().split('T')[0];
      if (novaOfensiva.ultimaData === ontemStr) novaOfensiva.dias += 1;
      else novaOfensiva.dias = 1;
      novaOfensiva.ultimaData = hojeStr;
    }

    const addPomodoro = tipoRegistro === 'Pomodoro' ? 1 : 0;

    await salvarDados({
      ...dadosEstudo,
      materias: novaListaMaterias,
      historicoEstudos: novoHistoricoEstudos,
      historicoDias: novoHistoricoDias,
      ofensiva: novaOfensiva,
      tempoTotal: (dadosEstudo.tempoTotal || 0) + minutosGanhos,
      pomodorosRealizados: (dadosEstudo.pomodorosRealizados || 0) + addPomodoro
    });

    setHorasManuais('');
    setMinutosManuais('');
  }

  function handleAddManual() {
    if (!verificarMatéria()) return;
    const h = parseInt(horasManuais) || 0;
    const m = parseInt(minutosManuais) || 0;
    const totalMin = (h * 60) + m;
    
    if (totalMin <= 0) {
      return alert("Insira um valor válido de horas ou minutos.");
    }
    finalizarSessao(totalMin, 'Manual');
  }

  function alterarAbaTempo(aba) {
    setAbaTempo(aba);
    setRodando(false);
    setModoDescanso(false);
    if (aba === 'pomodoro') setTempo(minutosFoco * 60);
    if (aba === 'cronometro') setTempo(0);
  }

  const minutosFormatados = String(Math.floor(tempo / 60)).padStart(2, '0');
  const segundosFormatados = String(tempo % 60).padStart(2, '0');

  return (
    <div className="space-y-6 animate-fade-in">
      
      <div className="bg-gradient-to-r from-indigo-700 to-indigo-900 rounded-2xl p-6 text-white shadow-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <p className="text-indigo-200 text-sm mb-1 uppercase tracking-wider font-bold">🎯 Foco Atual</p>
          <h2 className="text-2xl font-black">{concurso?.nome || "Nenhum edital cadastrado"}</h2>
          {diasRestantes !== null && (
            <p className="font-bold text-yellow-300 mt-1">
              <i className="fa-solid fa-hourglass-half mr-1"></i> 
              {diasRestantes > 0 ? `Faltam ${diasRestantes} dias` : diasRestantes === 0 ? "É HOJE!" : "A prova já passou"}
            </p>
          )}
        </div>
        <button onClick={() => setMostrarForm(!mostrarForm)} className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg font-bold transition">
          {mostrarForm ? "Cancelar" : "Configurar Prova"}
        </button>
      </div>

      {mostrarForm && (
        <form onSubmit={handleSalvarProva} className="bg-white dark:bg-gray-800 p-4 rounded-xl border dark:border-gray-700 flex flex-col sm:flex-row gap-3">
          <input type="text" placeholder="Nome do Concurso" value={nomeProva} onChange={e => setNomeProva(e.target.value)} required className="flex-1 p-2 border rounded-lg bg-gray-50 dark:bg-gray-700 dark:text-white dark:border-gray-600 outline-none" />
          <input type="date" value={dataProva} onChange={e => setDataProva(e.target.value)} required className="p-2 border rounded-lg bg-gray-50 dark:bg-gray-700 dark:text-white dark:border-gray-600 outline-none" />
          <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-bold transition">Salvar</button>
        </form>
      )}

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'Ofensiva', val: dadosEstudo.ofensiva?.dias||0, icone: 'fa-fire', cor: 'orange', action: () => zerar('ofensiva', 'dias') },
          { label: 'Tempo', val: `${horasTotais}h ${minutosTotais}m`, icone: 'fa-clock', cor: 'indigo', action: () => zerar('tempoTotal') },
          { label: 'Pomodoros', val: dadosEstudo.pomodorosRealizados||0, icone: 'fa-stopwatch', cor: 'blue', action: () => zerar('pomodorosRealizados') },
          { label: 'Páginas', val: dadosEstudo.paginasLidas||0, icone: 'fa-book-open', cor: 'green', action: () => zerar('paginasLidas') },
          { label: 'Questões', val: totQ, icone: 'fa-check-double', cor: 'purple', action: () => zerar('questoesGerais', 'acertos') }
        ].map((card, i) => (
          <div key={i} className={`bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border-l-4 border-${card.cor}-400 relative group`}>
            <button onClick={card.action} className="absolute top-2 right-2 text-gray-300 dark:text-gray-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition"><i className="fa-solid fa-rotate-left"></i></button>
            <p className="text-xs text-gray-500 font-bold uppercase truncate">{card.label}</p>
            <p className="text-2xl font-black text-gray-800 dark:text-white mt-1">
              <i className={`fa-solid ${card.icone} text-${card.cor}-500 mr-2`}></i>{card.val}
            </p>
          </div>
        ))}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-6 md:p-8 max-w-2xl mx-auto flex flex-col items-center">
        
        <div className="w-full mb-6">
          <label className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-2 text-center">O que você vai estudar agora?</label>
          <select value={materiaSelecionada} onChange={e => setMateriaSelecionada(e.target.value)} className="w-full p-3 border rounded-xl bg-gray-50 dark:bg-gray-700 dark:text-white dark:border-gray-600 outline-none font-bold text-center">
            <option value="">Selecione a matéria...</option>
            {materias.map((m, i) => <option key={i} value={m.nome}>{m.nome}</option>)}
          </select>
        </div>

        <div className="flex gap-6 mb-6 font-black text-xs md:text-sm tracking-wider">
          <button onClick={() => alterarAbaTempo('pomodoro')} className={`pb-1 border-b-2 transition ${abaTempo === 'pomodoro' ? 'border-indigo-500 text-indigo-500' : 'border-transparent text-gray-400'}`}>POMODORO</button>
          <button onClick={() => alterarAbaTempo('cronometro')} className={`pb-1 border-b-2 transition ${abaTempo === 'cronometro' ? 'border-indigo-500 text-indigo-500' : 'border-transparent text-gray-400'}`}>CRONÔMETRO</button>
          <button onClick={() => alterarAbaTempo('manual')} className={`pb-1 border-b-2 transition ${abaTempo === 'manual' ? 'border-indigo-500 text-indigo-500' : 'border-transparent text-gray-400'}`}>MANUAL</button>
        </div>

        {abaTempo === 'pomodoro' && (
          <div className="flex items-center gap-6 mb-6 text-xs md:text-sm font-bold text-gray-400">
            <div className="flex items-center gap-2">
              <span>Foco:</span>
              <input type="number" value={minutosFoco} onChange={e => setMinutosFoco(parseInt(e.target.value) || 1)} className="w-14 p-1 text-center border rounded bg-gray-50 dark:bg-gray-700 dark:text-white dark:border-gray-600 font-black" />
            </div>
            <div className="flex items-center gap-2">
              <span>Pausa:</span>
              <input type="number" value={minutosPausa} onChange={e => setMinutosPausa(parseInt(e.target.value) || 1)} className="w-14 p-1 text-center border rounded bg-gray-50 dark:bg-gray-700 dark:text-white dark:border-gray-600 font-black" />
            </div>
          </div>
        )}

        {abaTempo !== 'manual' ? (
          <>
            <div className="text-6xl md:text-8xl font-black text-indigo-400 tracking-wider font-mono mb-8">
              {minutosFormatados}:{segundosFormatados}
            </div>

            <div className="flex flex-wrap gap-3 justify-center w-full mb-4">
              <button 
                onClick={() => { if (verificarMatéria()) setRodando(!rodando); }} 
                className={`px-8 py-3 rounded-xl font-black text-white shadow-md transition text-base w-36 ${rodando ? 'bg-amber-500 hover:bg-amber-600' : 'bg-indigo-600 hover:bg-indigo-700'}`}
              >
                {rodando ? 'Pausar' : 'Focar'}
              </button>
              
              {abaTempo === 'cronometro' && tempo > 0 && (
                <button onClick={() => { setRodando(false); finalizarSessao(Math.floor(tempo/60), 'Cronômetro'); setTempo(0); }} className="px-6 py-3 rounded-xl font-black text-white bg-green-500 hover:bg-green-600 shadow-md transition">
                  Salvar
                </button>
              )}

              {abaTempo === 'pomodoro' && (
                <button onClick={() => { setModoDescanso(!modoDescanso); setTempo((!modoDescanso ? minutosPausa : minutosFoco) * 60); }} className="px-6 py-3 rounded-xl font-black text-white bg-emerald-500 hover:bg-emerald-600 shadow-md transition">
                  {modoDescanso ? 'Voltar Foco' : 'Descansar'}
                </button>
              )}
            </div>

            <button onClick={() => { setRodando(false); setTempo(abaTempo === 'pomodoro' ? minutosFoco * 60 : 0); setModoDescanso(false); }} className="text-red-500 hover:underline text-xs font-bold mt-2">
              Parar e Resetar
            </button>
          </>
        ) : (
          <div className="flex flex-col items-center w-full max-w-sm space-y-4 my-6">
            <label className="text-xs font-bold text-gray-400 uppercase">Insira o tempo de estudo</label>
            <div className="flex w-full gap-2 items-center">
              <div className="flex-1 flex items-center gap-1">
                <input type="number" value={horasManuais} onChange={e => setHorasManuais(e.target.value)} placeholder="0" min="0" className="w-full p-3 border rounded-xl bg-gray-50 dark:bg-gray-700 dark:text-white font-black text-center text-xl outline-none" />
                <span className="text-xs font-bold text-gray-400">h</span>
              </div>
              <div className="flex-1 flex items-center gap-1">
                <input type="number" value={minutosManuais} onChange={e => setMinutosManuais(e.target.value)} placeholder="0" min="0" max="59" className="w-full p-3 border rounded-xl bg-gray-50 dark:bg-gray-700 dark:text-white font-black text-center text-xl outline-none" />
                <span className="text-xs font-bold text-gray-400">m</span>
              </div>
              <button onClick={handleAddManual} className="bg-emerald-500 text-white px-6 py-3 rounded-xl font-black hover:bg-emerald-600 transition shadow">
                Adicionar
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}