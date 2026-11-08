import React, { useState, useEffect, useRef } from 'react';
import { useData } from '../context/DataContext';

const STORAGE_TIMER_KEY = 'estudopro_timer_ativo_v1';
const OPCOES_CICLOS_PADRAO = [
  { dias: 1, label: '24h (1d)' },
  { dias: 3, label: '3 dias' },
  { dias: 7, label: '7 dias' },
  { dias: 15, label: '15 dias' },
  { dias: 30, label: '30 dias' },
  { dias: 60, label: '60 dias' }
];

export default function Dashboard() {
  const { dadosEstudo, salvarDados } = useData();

  // Estados de configuração da prova
  const [modalProvaAberto, setModalProvaAberto] = useState(false);
  const [nomeProvaInput, setNomeProvaInput] = useState('');
  const [dataProvaInput, setDataProvaInput] = useState('');

  // Estados do Motor de Estudo (Carregados inicialmente do localStorage para sobreviver ao F5)
  const [materiaSelecionada, setMateriaSelecionada] = useState('');
  const [modoTimer, setModoTimer] = useState('pomodoro'); // 'pomodoro' | 'cronometro' | 'manual'
  const [focoMinutos, setFocoMinutos] = useState(25);
  const [pausaMinutos, setPausaMinutos] = useState(5);
  const [emPausa, setEmPausa] = useState(false);
  const [rodando, setRodando] = useState(false);
  const [segundosRestantes, setSegundosRestantes] = useState(25 * 60);
  const [segundosDecorridos, setSegundosDecorridos] = useState(0);
  const [minutosManuais, setMinutosManuais] = useState('');
  const [timerHidratado, setTimerHidratado] = useState(false);

  const alvoTimestampRef = useRef(null);
  const inicioTimestampRef = useRef(null);
  const acumuladoSegundosRef = useRef(0);

  // Estados do Modal de Fechamento de Sessão
  const [modalSalvarAberto, setModalSalvarAberto] = useState(false);
  const [sessaoPendente, setSessaoPendente] = useState({ minutos: 0, origemPomodoro: false });
  const [topicoEstudado, setTopicoEstudado] = useState('');
  const [paginasSessao, setPaginasSessao] = useState('');
  const [acertosSessao, setAcertosSessao] = useState('');
  const [errosSessao, setErrosSessao] = useState('');
  
  // Estados de Revisão Personalizável no Modal
  const [agendarRevisao, setAgendarRevisao] = useState(true);
  const [ciclosEscolhidos, setCiclosEscolhidos] = useState([1, 7, 15, 30]);
  const [diaCustomInput, setDiaCustomInput] = useState('');
  const [marcarTopicoConcluido, setMarcarTopicoConcluido] = useState(false);
  const [abaterBlocoPlanejamento, setAbaterBlocoPlanejamento] = useState(true);

  const materias = dadosEstudo?.materias || [];
  const concursoAtual = dadosEstudo?.concursos?.[0] || { nome: 'Meu Edital', data: '' };

  // 1. HIDRATAÇÃO DO TIMER AO ABRIR OU DAR REFRESH (F5)
  useEffect(() => {
    try {
      const salvoRaw = localStorage.getItem(STORAGE_TIMER_KEY);
      if (salvoRaw) {
        const salvo = JSON.parse(salvoRaw);
        if (salvo.materiaSelecionada) setMateriaSelecionada(salvo.materiaSelecionada);
        if (salvo.modoTimer) setModoTimer(salvo.modoTimer);
        if (salvo.focoMinutos) setFocoMinutos(salvo.focoMinutos);
        if (salvo.pausaMinutos) setPausaMinutos(salvo.pausaMinutos);
        if (salvo.emPausa !== undefined) setEmPausa(salvo.emPausa);

        acumuladoSegundosRef.current = salvo.acumuladoSegundos || 0;

        if (salvo.rodando) {
          const agora = Date.now();
          if (salvo.modoTimer === 'pomodoro' && salvo.alvoTimestamp) {
            alvoTimestampRef.current = salvo.alvoTimestamp;
            const diff = Math.max(0, Math.round((salvo.alvoTimestamp - agora) / 1000));
            setSegundosRestantes(diff);
            setRodando(true);
          } else if (salvo.modoTimer === 'cronometro' && salvo.inicioTimestamp) {
            inicioTimestampRef.current = salvo.inicioTimestamp;
            const passados = Math.floor((agora - salvo.inicioTimestamp) / 1000) + (salvo.acumuladoSegundos || 0);
            setSegundosDecorridos(passados);
            setRodando(true);
          }
        } else {
          if (typeof salvo.segundosRestantes === 'number') setSegundosRestantes(salvo.segundosRestantes);
          if (typeof salvo.segundosDecorridos === 'number') setSegundosDecorridos(salvo.segundosDecorridos);
        }
      }
    } catch (e) {
      console.error('Erro ao restaurar timer do localStorage:', e);
    } finally {
      setTimerHidratado(true);
    }
  }, []);

  // 2. SALVAMENTO AUTOMÁTICO DO ESTADO DO TIMER NO LOCALSTORAGE
  useEffect(() => {
    if (!timerHidratado) return;
    const estadoParaSalvar = {
      materiaSelecionada,
      modoTimer,
      focoMinutos,
      pausaMinutos,
      emPausa,
      rodando,
      segundosRestantes,
      segundosDecorridos,
      alvoTimestamp: alvoTimestampRef.current,
      inicioTimestamp: inicioTimestampRef.current,
      acumuladoSegundos: acumuladoSegundosRef.current
    };
    localStorage.setItem(STORAGE_TIMER_KEY, JSON.stringify(estadoParaSalvar));
  }, [
    timerHidratado,
    materiaSelecionada,
    modoTimer,
    focoMinutos,
    pausaMinutos,
    emPausa,
    rodando,
    segundosRestantes,
    segundosDecorridos
  ]);

  // 3. LOOP DO RELÓGIO BASEADO EM TIMESTAMP REAL (Date.now)
  useEffect(() => {
    if (!rodando) return;

    const interval = setInterval(() => {
      const agora = Date.now();

      if (modoTimer === 'pomodoro') {
        const diff = Math.max(0, Math.round((alvoTimestampRef.current - agora) / 1000));
        setSegundosRestantes(diff);

        if (diff === 0) {
          setRodando(false);
          if (!emPausa) {
            abrirModalFechamento(focoMinutos, true);
            setEmPausa(true);
            setSegundosRestantes(pausaMinutos * 60);
          } else {
            setEmPausa(false);
            setSegundosRestantes(focoMinutos * 60);
          }
        }
      } else if (modoTimer === 'cronometro') {
        const passados = Math.floor((agora - inicioTimestampRef.current) / 1000) + acumuladoSegundosRef.current;
        setSegundosDecorridos(passados);
      }
    }, 500);

    return () => clearInterval(interval);
  }, [rodando, modoTimer, emPausa, focoMinutos, pausaMinutos]);

  function alterarFocoMinutos(novoValor) {
    const val = Math.max(1, Number(novoValor) || 25);
    setFocoMinutos(val);
    if (!rodando && !emPausa) {
      setSegundosRestantes(val * 60);
    }
  }

  function alterarPausaMinutos(novoValor) {
    const val = Math.max(1, Number(novoValor) || 5);
    setPausaMinutos(val);
    if (!rodando && emPausa) {
      setSegundosRestantes(val * 60);
    }
  }

  function iniciarOuPausar() {
    if (!materiaSelecionada) {
      alert('Selecione uma matéria antes de iniciar!');
      return;
    }

    if (!rodando) {
      const agora = Date.now();
      if (modoTimer === 'pomodoro') {
        alvoTimestampRef.current = agora + segundosRestantes * 1000;
      } else if (modoTimer === 'cronometro') {
        inicioTimestampRef.current = agora;
      }
      setRodando(true);
    } else {
      if (modoTimer === 'cronometro') {
        acumuladoSegundosRef.current = segundosDecorridos;
      }
      setRodando(false);
    }
  }

  function resetarTimer() {
    setRodando(false);
    acumuladoSegundosRef.current = 0;
    alvoTimestampRef.current = null;
    inicioTimestampRef.current = null;
    if (modoTimer === 'pomodoro') {
      setEmPausa(false);
      setSegundosRestantes(focoMinutos * 60);
    } else {
      setSegundosDecorridos(0);
    }
    localStorage.removeItem(STORAGE_TIMER_KEY);
  }

  function abrirModalFechamento(minutos, veioDoPomodoro = false) {
    if (!materiaSelecionada) {
      alert('Selecione uma matéria primeiro!');
      return;
    }
    setRodando(false);
    if (modoTimer === 'cronometro') {
      acumuladoSegundosRef.current = segundosDecorridos;
    }

    const minValidos = Math.max(1, Math.round(minutos));
    setSessaoPendente({ minutos: minValidos, origemPomodoro: veioDoPomodoro });
    setTopicoEstudado('');
    setPaginasSessao('');
    setAcertosSessao('');
    setErrosSessao('');
    setAgendarRevisao(true);
    setCiclosEscolhidos(dadosEstudo?.intervalosRevisao || [1, 7, 15, 30]);
    setMarcarTopicoConcluido(false);
    setAbaterBlocoPlanejamento(true);
    setModalSalvarAberto(true);
  }

  function toggleCicloRevisao(dias) {
    if (ciclosEscolhidos.includes(dias)) {
      setCiclosEscolhidos(ciclosEscolhidos.filter((d) => d !== dias));
    } else {
      setCiclosEscolhidos([...ciclosEscolhidos, dias].sort((a, b) => a - b));
    }
  }

  function adicionarCicloCustom() {
    const num = parseInt(diaCustomInput, 10);
    if (!num || num <= 0 || num > 365) return;
    if (!ciclosEscolhidos.includes(num)) {
      setCiclosEscolhidos([...ciclosEscolhidos, num].sort((a, b) => a - b));
    }
    setDiaCustomInput('');
  }

  function handleConcluirCronometro() {
    if (
      segundosDecorridos < 60 &&
      !window.confirm('Menos de 1 minuto registrado. Deseja salvar como 1 minuto mesmo assim?')
    ) {
      return;
    }
    const min = Math.max(1, Math.round(segundosDecorridos / 60));
    abrirModalFechamento(min, false);
  }

  function handleConcluirManual(e) {
    e.preventDefault();
    const min = parseInt(minutosManuais, 10);
    if (!min || min <= 0) {
      alert('Informe uma quantidade válida de minutos!');
      return;
    }
    abrirModalFechamento(min, false);
  }

  async function confirmarSalvamentoSessao(e) {
    e.preventDefault();
    const min = sessaoPendente.minutos;
    const paginas = parseInt(paginasSessao, 10) || 0;
    const acertos = parseInt(acertosSessao, 10) || 0;
    const erros = parseInt(errosSessao, 10) || 0;
    const hojeStr = new Date().toISOString().split('T')[0];

    // 1. Atualiza a matéria estudada
    const novasMaterias = materias.map((m) => {
      if (m.nome !== materiaSelecionada) return m;
      const novosTopicos = (m.topicos || []).map((t) => {
        if (marcarTopicoConcluido && t.nome === topicoEstudado) {
          return { ...t, concluido: true };
        }
        return t;
      });
      return {
        ...m,
        tempo: (m.tempo || 0) + min,
        acertos: (m.acertos || 0) + acertos,
        erros: (m.erros || 0) + erros,
        paginas: (m.paginas || 0) + paginas,
        topicos: novosTopicos
      };
    });

    // 2. Atualiza Histórico Diário
    const histDias = { ...(dadosEstudo?.historicoDias || {}) };
    const diaAtual = histDias[hojeStr] || { minutos: 0, paginas: 0, acertos: 0, erros: 0 };
    histDias[hojeStr] = {
      minutos: diaAtual.minutos + min,
      paginas: diaAtual.paginas + paginas,
      acertos: diaAtual.acertos + acertos,
      erros: diaAtual.erros + erros
    };

    // 3. Atualiza Log de Sessões
    const novoRegistro = {
      id: Date.now(),
      data: hojeStr,
      materia: materiaSelecionada,
      topico: topicoEstudado || 'Estudo Geral',
      minutos: min,
      paginas,
      acertos,
      erros
    };
    const novoHistoricoEstudos = [novoRegistro, ...(dadosEstudo?.historicoEstudos || [])];

    // 4. Calcula Ofensiva
    const ofensivaAtual = dadosEstudo?.ofensiva || { dias: 0, ultimaData: null };
    let novosDiasOfensiva = ofensivaAtual.dias || 0;
    if (ofensivaAtual.ultimaData !== hojeStr) {
      const ontem = new Date();
      ontem.setDate(ontem.getDate() - 1);
      const ontemStr = ontem.toISOString().split('T')[0];
      novosDiasOfensiva = ofensivaAtual.ultimaData === ontemStr ? novosDiasOfensiva + 1 : 1;
    }

    // 5. Agenda Revisões Espaçadas conforme os ciclos selecionados no Modal
    let novasRevisoes = [...(dadosEstudo?.revisoes || [])];
    if (agendarRevisao && ciclosEscolhidos.length > 0) {
      const baseDate = new Date();
      const lotesRevisao = ciclosEscolhidos.map((dias, idx) => {
        const dataRev = new Date(baseDate);
        dataRev.setDate(dataRev.getDate() + dias);
        return {
          id: `${Date.now()}_${idx}`,
          materia: materiaSelecionada,
          topico: topicoEstudado || `Sessão de ${min}min (${hojeStr})`,
          ciclo: `${dias}d`,
          dataPrevista: dataRev.toISOString().split('T')[0],
          concluida: false
        };
      });
      novasRevisoes = [...novasRevisoes, ...lotesRevisao];
    }

    // 6. Marca Automaticamente os Blocos na Aba de Planejamento
    const configPlanAtual = dadosEstudo?.configPlanejamento || {
      horasSemanais: 24,
      duracaoBlocoMin: 60,
      blocosConcluidos: {},
      minutosNoCiclo: {}
    };
    const duracaoBloco = Number(configPlanAtual.duracaoBlocoMin) || 60;
    const novosBlocosConcluidos = { ...(configPlanAtual.blocosConcluidos || {}) };
    const novosMinutosNoCiclo = { ...(configPlanAtual.minutosNoCiclo || {}) };

    if (abaterBlocoPlanejamento) {
      const acumuladoAnterior = novosMinutosNoCiclo[materiaSelecionada] || 0;
      const novoAcumulado = acumuladoAnterior + min;
      novosMinutosNoCiclo[materiaSelecionada] = novoAcumulado;

      // Calcula quantos blocos inteiros essa matéria já conquistou pela soma de minutos
      const qtdBlocosPeloTempo = Math.floor(novoAcumulado / duracaoBloco);

      if (qtdBlocosPeloTempo > 0) {
        for (let i = 0; i < qtdBlocosPeloTempo; i++) {
          novosBlocosConcluidos[`${materiaSelecionada}_${i}`] = true;
        }
      } else {
        // Se a sessão foi menor que 1 bloco completo mas o usuário pediu para abater,
        // marca o primeiro bloco livre daquela matéria
        for (let i = 0; i < 50; i++) {
          const chave = `${materiaSelecionada}_${i}`;
          if (!novosBlocosConcluidos[chave]) {
            novosBlocosConcluidos[chave] = true;
            novosMinutosNoCiclo[materiaSelecionada] = (i + 1) * duracaoBloco;
            break;
          }
        }
      }
    }

    // 7. Salva tudo no Firestore
    await salvarDados({
      ...dadosEstudo,
      tempoTotal: (dadosEstudo?.tempoTotal || 0) + min,
      paginasLidas: (dadosEstudo?.paginasLidas || 0) + paginas,
      pomodorosRealizados: (dadosEstudo?.pomodorosRealizados || 0) + (sessaoPendente.origemPomodoro ? 1 : 0),
      questoesGerais: {
        acertos: (dadosEstudo?.questoesGerais?.acertos || 0) + acertos,
        erros: (dadosEstudo?.questoesGerais?.erros || 0) + erros
      },
      ofensiva: { dias: novosDiasOfensiva, ultimaData: hojeStr },
      materias: novasMaterias,
      historicoDias: histDias,
      historicoEstudos: novoHistoricoEstudos,
      revisoes: novasRevisoes,
      configPlanejamento: {
        ...configPlanAtual,
        blocosConcluidos: novosBlocosConcluidos,
        minutosNoCiclo: novosMinutosNoCiclo
      }
    });

    setModalSalvarAberto(false);
    setMinutosManuais('');
    resetarTimer();
  }

  async function handleSalvarConfigProva(e) {
    e.preventDefault();
    if (!nomeProvaInput.trim()) return;
    await salvarDados({
      ...dadosEstudo,
      concursos: [{ nome: nomeProvaInput.trim(), data: dataProvaInput }]
    });
    setModalProvaAberto(false);
  }

  const tempoTotalMin = dadosEstudo?.tempoTotal || 0;
  const horasTotais = Math.floor(tempoTotalMin / 60);
  const minutosTotais = tempoTotalMin % 60;
  const totalQuestoes = (dadosEstudo?.questoesGerais?.acertos || 0) + (dadosEstudo?.questoesGerais?.erros || 0);

  const calcularDiasRestantes = () => {
    if (!concursoAtual.data) return null;
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const dataAlvo = new Date(concursoAtual.data + 'T00:00:00');
    return Math.ceil((dataAlvo - hoje) / (1000 * 60 * 60 * 24));
  };

  const diasRestantes = calcularDiasRestantes();
  const formatarRelogio = (seg) => {
    const m = Math.floor(seg / 60).toString().padStart(2, '0');
    const s = (seg % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const materiaObjAtual = materias.find((m) => m.nome === materiaSelecionada);
  const topicosDaMateria = materiaObjAtual?.topicos || [];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Banner Principal da Prova */}
      <div className="bg-gradient-to-r from-indigo-700 via-indigo-600 to-purple-700 rounded-2xl p-6 text-white shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-extrabold uppercase tracking-wider bg-white/20 px-2.5 py-1 rounded-full">
            🎯 Foco Atual
          </span>
          <h2 className="text-3xl font-black mt-2">{concursoAtual.nome}</h2>
          <p className="text-yellow-300 font-bold text-sm mt-1 flex items-center gap-1.5">
            <i className="fa-solid fa-hourglass-half"></i>
            {diasRestantes !== null
              ? diasRestantes >= 0
                ? `Faltam ${diasRestantes} dias`
                : 'Prova já realizada'
              : 'Data da prova não definida'}
          </p>
        </div>
        <button
          onClick={() => {
            setNomeProvaInput(concursoAtual.nome);
            setDataProvaInput(concursoAtual.data);
            setModalProvaAberto(true);
          }}
          className="bg-white/20 hover:bg-white/30 text-white font-bold px-4 py-2.5 rounded-xl backdrop-blur transition"
        >
          Configurar Prova
        </button>
      </div>

      {/* Cards de Métricas Rápidas */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border dark:border-gray-700 shadow-sm">
          <span className="text-xs font-bold text-gray-400 uppercase">Ofensiva</span>
          <div className="text-2xl font-black mt-1 flex items-center gap-2 text-gray-800 dark:text-white">
            <i className="fa-solid fa-fire text-orange-500"></i>
            {dadosEstudo?.ofensiva?.dias || 0}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border dark:border-gray-700 shadow-sm">
          <span className="text-xs font-bold text-gray-400 uppercase">Tempo</span>
          <div className="text-2xl font-black mt-1 flex items-center gap-2 text-gray-800 dark:text-white">
            <i className="fa-solid fa-clock text-indigo-500"></i>
            {horasTotais}h {minutosTotais}m
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border dark:border-gray-700 shadow-sm">
          <span className="text-xs font-bold text-gray-400 uppercase">Pomodoros</span>
          <div className="text-2xl font-black mt-1 flex items-center gap-2 text-gray-800 dark:text-white">
            <i className="fa-solid fa-stopwatch text-blue-500"></i>
            {dadosEstudo?.pomodorosRealizados || 0}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border dark:border-gray-700 shadow-sm">
          <span className="text-xs font-bold text-gray-400 uppercase">Páginas</span>
          <div className="text-2xl font-black mt-1 flex items-center gap-2 text-gray-800 dark:text-white">
            <i className="fa-solid fa-book-open text-emerald-500"></i>
            {dadosEstudo?.paginasLidas || 0}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border dark:border-gray-700 shadow-sm col-span-2 sm:col-span-1">
          <span className="text-xs font-bold text-gray-400 uppercase">Questões</span>
          <div className="text-2xl font-black mt-1 flex items-center gap-2 text-gray-800 dark:text-white">
            <i className="fa-solid fa-check-double text-purple-500"></i>
            {totalQuestoes}
          </div>
        </div>
      </div>

      {/* Central de Estudo (Pomodoro / Cronômetro / Manual) */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border dark:border-gray-700 shadow-sm max-w-2xl mx-auto text-center">
        {rodando && (
          <div className="mb-4 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 text-xs font-black animate-pulse">
            <i className="fa-solid fa-shield-halved"></i>
            Sessão protegida contra atualização de página (F5)
          </div>
        )}

        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
          O que você vai estudar agora?
        </label>
        <select
          value={materiaSelecionada}
          onChange={(e) => setMateriaSelecionada(e.target.value)}
          className="w-full p-3.5 rounded-xl bg-gray-100 dark:bg-gray-900 border dark:border-gray-700 font-bold text-gray-800 dark:text-white outline-none mb-6 cursor-pointer"
        >
          <option value="">Selecione a matéria...</option>
          {materias.map((m, idx) => (
            <option key={idx} value={m.nome}>{m.nome}</option>
          ))}
        </select>

        {/* Abas de Modo */}
        <div className="flex justify-center gap-6 border-b dark:border-gray-700 mb-6 text-xs font-black uppercase tracking-wider">
          {['pomodoro', 'cronometro', 'manual'].map((modo) => (
            <button
              key={modo}
              onClick={() => {
                if (rodando && !window.confirm('O timer está rodando. Deseja trocar de modo e reiniciar a contagem atual?')) {
                  return;
                }
                resetarTimer();
                setModoTimer(modo);
              }}
              className={`pb-3 border-b-2 transition ${
                modoTimer === modo
                  ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              {modo === 'pomodoro' ? 'Pomodoro' : modo === 'cronometro' ? 'Cronômetro' : 'Manual'}
            </button>
          ))}
        </div>

        {modoTimer === 'pomodoro' && (
          <div>
            <div className="flex justify-center items-center gap-4 mb-4 text-xs font-bold text-gray-500">
              <div>
                Foco:{' '}
                <input
                  type="number"
                  min="1"
                  max="180"
                  disabled={rodando}
                  value={focoMinutos}
                  onChange={(e) => alterarFocoMinutos(e.target.value)}
                  className="w-14 p-1.5 text-center rounded-lg bg-gray-100 dark:bg-gray-900 dark:text-white border dark:border-gray-700"
                />
              </div>
              <div>
                Pausa:{' '}
                <input
                  type="number"
                  min="1"
                  max="60"
                  disabled={rodando}
                  value={pausaMinutos}
                  onChange={(e) => alterarPausaMinutos(e.target.value)}
                  className="w-14 p-1.5 text-center rounded-lg bg-gray-100 dark:bg-gray-900 dark:text-white border dark:border-gray-700"
                />
              </div>
            </div>

            <div className="text-7xl font-black text-indigo-600 dark:text-indigo-400 my-6 font-mono">
              {formatarRelogio(segundosRestantes)}
            </div>

            <div className="flex flex-wrap justify-center gap-3">
              <button
                onClick={iniciarOuPausar}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-black px-8 py-3 rounded-xl shadow transition"
              >
                {rodando ? 'Pausar' : 'Iniciar'}
              </button>
              <button
                onClick={() => abrirModalFechamento(Math.max(1, focoMinutos - Math.floor(segundosRestantes / 60)), true)}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-black px-6 py-3 rounded-xl shadow transition"
                title="Finalizar e registrar agora"
              >
                Concluir e Salvar
              </button>
              <button
                onClick={resetarTimer}
                className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-bold px-4 py-3 rounded-xl transition"
                title="Zerar relógio"
              >
                <i className="fa-solid fa-rotate-right"></i>
              </button>
            </div>
          </div>
        )}

        {modoTimer === 'cronometro' && (
          <div>
            <div className="text-7xl font-black text-emerald-500 my-6 font-mono">
              {formatarRelogio(segundosDecorridos)}
            </div>
            <div className="flex flex-wrap justify-center gap-3">
              <button
                onClick={iniciarOuPausar}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-black px-8 py-3 rounded-xl shadow transition"
              >
                {rodando ? 'Pausar' : 'Iniciar'}
              </button>
              <button
                onClick={handleConcluirCronometro}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-black px-6 py-3 rounded-xl shadow transition"
              >
                Finalizar e Salvar
              </button>
              <button
                onClick={resetarTimer}
                className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-bold px-4 py-3 rounded-xl transition"
                title="Zerar cronômetro"
              >
                <i className="fa-solid fa-rotate-right"></i>
              </button>
            </div>
          </div>
        )}

        {modoTimer === 'manual' && (
          <form onSubmit={handleConcluirManual} className="space-y-4 max-w-sm mx-auto">
            <div>
              <label className="block text-xs font-bold text-gray-400 mb-1">
                Tempo estudado ( em minutos )
              </label>
              <input
                type="number"
                min="1"
                required
                placeholder="Ex: 60"
                value={minutosManuais}
                onChange={(e) => setMinutosManuais(e.target.value)}
                className="w-full p-3 text-center text-xl font-black rounded-xl bg-gray-100 dark:bg-gray-900 border dark:border-gray-700 dark:text-white outline-none"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-3 rounded-xl shadow transition"
            >
              Prosseguir para Resumo da Sessão
            </button>
          </form>
        )}
      </div>

      {/* MODAL DE FECHAMENTO DE SESSÃO (Páginas, Questões, Seletor de Revisões e Ciclo) */}
      {modalSalvarAberto && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-2xl p-6 w-full max-w-lg shadow-2xl my-8 animate-fade-in">
            <div className="flex justify-between items-center border-b dark:border-gray-700 pb-3 mb-4">
              <div>
                <span className="text-xs font-black uppercase text-indigo-500">Resumo do Estudo</span>
                <h3 className="text-xl font-black text-gray-800 dark:text-white">
                  {materiaSelecionada} ({sessaoPendente.minutos} min)
                </h3>
              </div>
              <button
                onClick={() => setModalSalvarAberto(false)}
                className="text-gray-400 hover:text-red-500 text-lg"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <form onSubmit={confirmarSalvamentoSessao} className="space-y-4">
              {/* Tópico Estudado */}
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-300 uppercase mb-1">
                  Tópico / Assunto Estudado (Opcional)
                </label>
                {topicosDaMateria.length > 0 ? (
                  <select
                    value={topicoEstudado}
                    onChange={(e) => setTopicoEstudado(e.target.value)}
                    className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-900 border dark:border-gray-700 text-sm font-bold dark:text-white outline-none"
                  >
                    <option value="">Selecione um tópico do edital ou deixe geral...</option>
                    {topicosDaMateria.map((t, idx) => (
                      <option key={idx} value={t.nome}>
                        {t.concluido ? '✅ ' : '⏳ '} {t.nome}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    placeholder="Ex: Controle de Constitucionalidade"
                    value={topicoEstudado}
                    onChange={(e) => setTopicoEstudado(e.target.value)}
                    className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-900 border dark:border-gray-700 text-sm font-bold dark:text-white outline-none"
                  />
                )}

                {topicoEstudado && topicosDaMateria.some((t) => t.nome === topicoEstudado && !t.concluido) && (
                  <label className="flex items-center gap-2 mt-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={marcarTopicoConcluido}
                      onChange={(e) => setMarcarTopicoConcluido(e.target.checked)}
                      className="rounded accent-emerald-600"
                    />
                    Marcar este tópico como concluído no Meu Edital
                  </label>
                )}
              </div>

              {/* Páginas e Questões */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-300 uppercase mb-1">
                    📖 Páginas Lidas
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={paginasSessao}
                    onChange={(e) => setPaginasSessao(e.target.value)}
                    className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-900 border dark:border-gray-700 font-black text-center dark:text-white outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-emerald-500 uppercase mb-1">
                    ✅ Acertos
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={acertosSessao}
                    onChange={(e) => setAcertosSessao(e.target.value)}
                    className="w-full p-3 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800 font-black text-center text-emerald-600 dark:text-emerald-400 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-red-500 uppercase mb-1">
                    ❌ Erros
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={errosSessao}
                    onChange={(e) => setErrosSessao(e.target.value)}
                    className="w-full p-3 rounded-xl bg-red-50/50 dark:bg-red-950/30 border border-red-300 dark:border-red-800 font-black text-center text-red-600 dark:text-red-400 outline-none"
                  />
                </div>
              </div>

              {/* Seletor Completo de Revisões */}
              <div className="p-4 rounded-xl bg-indigo-50/70 dark:bg-gray-900 border border-indigo-100 dark:border-gray-700 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="block text-sm font-black text-indigo-900 dark:text-indigo-300">
                      Agendar Revisões?
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      Escolha em quais dias deseja revisar este conteúdo
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={agendarRevisao}
                    onChange={(e) => setAgendarRevisao(e.target.checked)}
                    className="w-5 h-5 accent-indigo-600 rounded cursor-pointer"
                  />
                </div>

                {agendarRevisao && (
                  <div className="space-y-3 pt-2 border-t border-indigo-100 dark:border-gray-800">
                    {/* Atalhos Rápidos */}
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => setCiclosEscolhidos([1, 7, 15, 30])}
                        className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-indigo-100 dark:bg-gray-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-200 transition"
                      >
                        Padrão (1, 7, 15, 30d)
                      </button>
                      <button
                        type="button"
                        onClick={() => setCiclosEscolhidos([1, 3, 7])}
                        className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-indigo-100 dark:bg-gray-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-200 transition"
                      >
                        Reta Final (1, 3, 7d)
                      </button>
                      <button
                        type="button"
                        onClick={() => setCiclosEscolhidos([1])}
                        className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-indigo-100 dark:bg-gray-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-200 transition"
                      >
                        Apenas 24h
                      </button>
                      <button
                        type="button"
                        onClick={() => setCiclosEscolhidos([7])}
                        className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-indigo-100 dark:bg-gray-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-200 transition"
                      >
                        Apenas 7 dias
                      </button>
                    </div>

                    {/* Botões Individuais de Dias */}
                    <div className="flex flex-wrap gap-2">
                      {OPCOES_CICLOS_PADRAO.map((item) => {
                        const ativo = ciclosEscolhidos.includes(item.dias);
                        return (
                          <button
                            key={item.dias}
                            type="button"
                            onClick={() => toggleCicloRevisao(item.dias)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-black border transition flex items-center gap-1.5 ${
                              ativo
                                ? 'bg-indigo-600 border-indigo-500 text-white shadow-sm'
                                : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400'
                            }`}
                          >
                            {ativo && <i className="fa-solid fa-check text-[10px]"></i>}
                            {item.label}
                          </button>
                        );
                      })}

                      {/* Mostra também dias personalizados adicionados pelo usuário */}
                      {ciclosEscolhidos
                        .filter((d) => !OPCOES_CICLOS_PADRAO.some((o) => o.dias === d))
                        .map((d) => (
                          <button
                            key={d}
                            type="button"
                            onClick={() => toggleCicloRevisao(d)}
                            className="px-3 py-1.5 rounded-lg text-xs font-black bg-indigo-600 border border-indigo-500 text-white shadow-sm flex items-center gap-1.5"
                          >
                            <i className="fa-solid fa-check text-[10px]"></i>
                            {d} dias
                          </button>
                        ))}
                    </div>

                    {/* Campo para adicionar dia personalizado */}
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="1"
                        max="365"
                        placeholder="Outro prazo (em dias)..."
                        value={diaCustomInput}
                        onChange={(e) => setDiaCustomInput(e.target.value)}
                        className="flex-1 p-2 rounded-lg text-xs font-bold bg-white dark:bg-gray-800 border dark:border-gray-700 dark:text-white outline-none"
                      />
                      <button
                        type="button"
                        onClick={adicionarCicloCustom}
                        className="px-3 py-2 rounded-lg text-xs font-black bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-indigo-600 hover:text-white transition"
                      >
                        + Adicionar
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Opção de Abater Bloco no Ciclo de Planejamento */}
              <div className="p-3.5 rounded-xl bg-emerald-50/70 dark:bg-gray-900 border border-emerald-200 dark:border-gray-700 flex items-center justify-between">
                <div>
                  <span className="block text-sm font-black text-emerald-900 dark:text-emerald-300">
                    Marcar Bloco na Aba de Planejamento?
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    Tica automaticamente o bloco desta matéria no seu Ciclo Semanal
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={abaterBlocoPlanejamento}
                  onChange={(e) => setAbaterBlocoPlanejamento(e.target.checked)}
                  className="w-5 h-5 accent-emerald-600 rounded cursor-pointer"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalSalvarAberto(false)}
                  className="px-4 py-2.5 rounded-xl font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-black px-6 py-2.5 rounded-xl shadow-lg transition flex items-center gap-2"
                >
                  <i className="fa-solid fa-floppy-disk"></i>
                  Salvar Sessão Completa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Configurar Prova */}
      {modalProvaAberto && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-lg font-black mb-4 dark:text-white">Configurar Prova Atual</h3>
            <form onSubmit={handleSalvarConfigProva} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Nome do Concurso</label>
                <input
                  type="text"
                  required
                  value={nomeProvaInput}
                  onChange={(e) => setNomeProvaInput(e.target.value)}
                  className="w-full p-3 rounded-xl bg-gray-100 dark:bg-gray-900 border dark:border-gray-700 font-bold dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Data da Prova</label>
                <input
                  type="date"
                  value={dataProvaInput}
                  onChange={(e) => setDataProvaInput(e.target.value)}
                  className="w-full p-3 rounded-xl bg-gray-100 dark:bg-gray-900 border dark:border-gray-700 font-bold dark:text-white"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalProvaAberto(false)}
                  className="px-4 py-2 font-bold text-gray-500"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-indigo-600 text-white font-black px-6 py-2 rounded-xl"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}