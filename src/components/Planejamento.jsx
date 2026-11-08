import React, { useState } from 'react';
import { useData } from '../context/DataContext';

const PESOS_INCIDENCIA = {
  baixa: { label: 'Pouco Cobrado (0.8x)', fator: 0.8 },
  media: { label: 'Cobrança Normal (1.0x)', fator: 1.0 },
  alta: { label: 'Muito Cobrado (1.25x)', fator: 1.25 },
  altissima: { label: 'Assunto Crítico da Banca (1.5x)', fator: 1.5 }
};

const PESOS_DOMINIO = {
  iniciante: { label: 'Iniciante (Preciso de Base)', fator: 1.5 },
  intermediario: { label: 'Intermediário (Evoluindo)', fator: 1.15 },
  avancado: { label: 'Avançado (Só Revisão/Questões)', fator: 0.8 }
};

export default function Planejamento() {
  const { dadosEstudo, salvarDados } = useData();

  const materias = dadosEstudo?.materias || [];
  const configPlan = dadosEstudo?.configPlanejamento || {
    horasSemanais: 24,
    duracaoBlocoMin: 60,
    blocosConcluidos: {},
    minutosNoCiclo: {},
    ocultarTutorial: false
  };

  const [horasSemanais, setHorasSemanais] = useState(configPlan.horasSemanais || 24);
  const [duracaoBlocoMin, setDuracaoBlocoMin] = useState(configPlan.duracaoBlocoMin || 60);
  const [mostrarTutorial, setMostrarTutorial] = useState(!configPlan.ocultarTutorial);

  // Calcula domínio sugerido caso o usuário deixe no modo automático
  function obterDominioEfetivo(m) {
    if (m.nivelDominio && m.nivelDominio !== 'auto') return m.nivelDominio;
    const acertos = m.acertos || 0;
    const total = acertos + (m.erros || 0);
    if (total < 10) return 'iniciante';
    const taxa = (acertos / total) * 100;
    if (taxa >= 80) return 'avancado';
    if (taxa >= 60) return 'intermediario';
    return 'iniciante';
  }

  // Cálculo de relevância e prioridade (IRP) para cada matéria
  const materiasCalculadas = materias.map((m, index) => {
    const categoria = m.categoria || 'especifico';
    const pesoProva = Number(m.pesoProva) || 1;
    const qtdQuestoes = Number(m.qtdQuestoes) || 10;
    const incidencia = m.incidenciaBanca || 'media';
    const dominioKey = obterDominioEfetivo(m);

    const fatorCat = categoria === 'especifico' ? 1.2 : 1.0;
    const fatorInc = PESOS_INCIDENCIA[incidencia]?.fator || 1.0;
    const fatorDom = PESOS_DOMINIO[dominioKey]?.fator || 1.15;

    const pontosBrutos = qtdQuestoes * pesoProva;
    const irp = pontosBrutos * fatorCat * fatorInc * fatorDom;

    return {
      ...m,
      indexOriginal: index,
      categoria,
      pesoProva,
      qtdQuestoes,
      incidencia,
      dominioKey,
      pontosBrutos,
      irp
    };
  });

  const somaIrpTotal = materiasCalculadas.reduce((acc, m) => acc + m.irp, 0);

  // Distribuição de horas e blocos
  const planejamentoFinal = materiasCalculadas
    .map((m) => {
      const percentual = somaIrpTotal > 0 ? (m.irp / somaIrpTotal) * 100 : 0;
      const horasAlocadas = (percentual / 100) * horasSemanais;
      const minutosAlocados = Math.round(horasAlocadas * 60);
      const qtdBlocos = Math.max(1, Math.round(minutosAlocados / duracaoBlocoMin));

      let estrategia = { label: '⚡ Ritmo Constante', cor: 'text-yellow-500 bg-yellow-500/10' };
      if (percentual >= 14 && m.dominioKey === 'iniciante') {
        estrategia = { label: '🔥 Foco Máximo', cor: 'text-red-500 bg-red-500/10' };
      } else if (m.dominioKey === 'avancado') {
        estrategia = { label: '🔄 Manutenção', cor: 'text-emerald-500 bg-emerald-500/10' };
      } else if (percentual >= 12) {
        estrategia = { label: '🎯 Alta Prioridade', cor: 'text-indigo-400 bg-indigo-500/10' };
      }

      return {
        ...m,
        percentual,
        horasAlocadas,
        minutosAlocados,
        qtdBlocos,
        estrategia
      };
    })
    .sort((a, b) => b.irp - a.irp);

  async function atualizarParametroMateria(indexOriginal, campo, valor) {
    const novasMaterias = [...materias];
    novasMaterias[indexOriginal] = {
      ...novasMaterias[indexOriginal],
      [campo]: valor
    };
    await salvarDados({ ...dadosEstudo, materias: novasMaterias });
  }

  async function salvarConfigCiclo(novasHoras, novoBloco) {
    setHorasSemanais(novasHoras);
    setDuracaoBlocoMin(novoBloco);
    await salvarDados({
      ...dadosEstudo,
      configPlanejamento: {
        ...configPlan,
        horasSemanais: novasHoras,
        duracaoBlocoMin: novoBloco
      }
    });
  }

  async function alternarVisibilidadeTutorial() {
    const novoEstado = !mostrarTutorial;
    setMostrarTutorial(novoEstado);
    await salvarDados({
      ...dadosEstudo,
      configPlanejamento: {
        ...configPlan,
        ocultarTutorial: !novoEstado
      }
    });
  }

  async function toggleBlocoCiclo(nomeMateria, idxBloco) {
    const chave = `${nomeMateria}_${idxBloco}`;
    const blocosAtuais = { ...(configPlan.blocosConcluidos || {}) };
    blocosAtuais[chave] = !blocosAtuais[chave];

    await salvarDados({
      ...dadosEstudo,
      configPlanejamento: {
        ...configPlan,
        horasSemanais,
        duracaoBlocoMin,
        blocosConcluidos: blocosAtuais
      }
    });
  }

  async function reiniciarCicloCheckboxes() {
    if (!window.confirm('Deseja desmarcar todos os blocos para iniciar uma nova semana/giro de estudos?')) return;
    await salvarDados({
      ...dadosEstudo,
      configPlanejamento: {
        ...configPlan,
        blocosConcluidos: {},
        minutosNoCiclo: {}
      }
    });
  }

  const percBasicos = planejamentoFinal
    .filter((m) => m.categoria === 'basico')
    .reduce((acc, m) => acc + m.percentual, 0);
  const percEspecificos = 100 - percBasicos;

  const totalBlocosSemana = planejamentoFinal.reduce((acc, m) => acc + m.qtdBlocos, 0);
  const totalBlocosFeitos = planejamentoFinal.reduce((acc, m) => {
    let feitos = 0;
    for (let i = 0; i < m.qtdBlocos; i++) {
      if (configPlan.blocosConcluidos?.[`${m.nome}_${i}`]) feitos++;
    }
    return acc + feitos;
  }, 0);
  const progressoCicloPerc = totalBlocosSemana > 0 ? Math.round((totalBlocosFeitos / totalBlocosSemana) * 100) : 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Cabeçalho Principal */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border dark:border-gray-700 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase text-indigo-500">
                Ciclo Inteligente de Estudos
              </span>
              <button
                onClick={alternarVisibilidadeTutorial}
                className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-200 transition flex items-center gap-1"
              >
                <i className="fa-solid fa-circle-question"></i>
                {mostrarTutorial ? 'Ocultar Tutorial' : 'Como usar? (Tutorial)'}
              </button>
            </div>
            <h2 className="text-2xl font-black text-gray-800 dark:text-white mt-1">
              Planejamento Estratégico por Relevância
            </h2>
            <p className="text-xs text-gray-400 mt-1">
              Distribui suas horas da semana priorizando as matérias que valem mais pontos e onde você mais precisa evoluir.
            </p>
          </div>

          <div className="flex items-center gap-4 bg-gray-50 dark:bg-gray-900 p-3 rounded-xl border dark:border-gray-700">
            <div>
              <label className="block text-[10px] font-black uppercase text-gray-400">
                Horas / Semana
              </label>
              <input
                type="number"
                min="1"
                max="100"
                value={horasSemanais}
                onChange={(e) => salvarConfigCiclo(Number(e.target.value) || 20, duracaoBlocoMin)}
                className="w-20 p-1.5 mt-1 text-center font-black rounded-lg bg-white dark:bg-gray-800 border dark:border-gray-700 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase text-gray-400">
                Tamanho do Bloco
              </label>
              <select
                value={duracaoBlocoMin}
                onChange={(e) => salvarConfigCiclo(horasSemanais, Number(e.target.value))}
                className="p-1.5 mt-1 font-black rounded-lg bg-white dark:bg-gray-800 border dark:border-gray-700 dark:text-white text-sm"
              >
                <option value={45}>45 min</option>
                <option value={60}>1h (60m)</option>
                <option value={90}>1h 30m</option>
                <option value={120}>2h (120m)</option>
              </select>
            </div>
          </div>
        </div>

        {/* TUTORIAL PASSO A PASSO */}
        {mostrarTutorial && (
          <div className="mt-6 p-5 rounded-2xl bg-indigo-50/70 dark:bg-gray-900/90 border border-indigo-100 dark:border-indigo-900/50 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-indigo-900 dark:text-indigo-300 flex items-center gap-2">
                <i className="fa-solid fa-compass-drafting text-indigo-500"></i>
                Como funciona o seu Planejamento (3 Passos Simples)
              </h3>
              <button
                onClick={alternarVisibilidadeTutorial}
                className="text-xs font-bold text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                Entendi, fechar guia ✕
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border dark:border-gray-700">
                <span className="inline-block px-2 py-0.5 rounded bg-indigo-600 text-white font-black text-[10px] mb-2">
                  PASSO 1 • SUA ROTINA
                </span>
                <h4 className="font-black text-gray-800 dark:text-white mb-1">
                  Defina suas Horas e Blocos
                </h4>
                <p className="text-gray-500 dark:text-gray-400 leading-relaxed">
                  No canto superior direito, informe quantas <b>Horas por Semana</b> você tem disponível (ex: 24h) e a duração de cada <b>Bloco de Estudo</b> (ex: 1h por matéria).
                </p>
              </div>

              <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border dark:border-gray-700">
                <span className="inline-block px-2 py-0.5 rounded bg-purple-600 text-white font-black text-[10px] mb-2">
                  PASSO 2 • PESO DO EDITAL
                </span>
                <h4 className="font-black text-gray-800 dark:text-white mb-1">
                  Ajuste a Tabela Abaixo
                </h4>
                <p className="text-gray-500 dark:text-gray-400 leading-relaxed">
                  Classifique entre Básico e Específico, ajuste o <b>Peso</b> e a importância da matéria. No modo <b>🤖 Automático</b>, o sistema lê sua taxa de acertos para dar mais tempo às matérias onde você precisa evoluir.
                </p>
              </div>

              <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border dark:border-gray-700">
                <span className="inline-block px-2 py-0.5 rounded bg-emerald-600 text-white font-black text-[10px] mb-2">
                  PASSO 3 • ESTUDO AUTOMÁTICO
                </span>
                <h4 className="font-black text-gray-800 dark:text-white mb-1">
                  Siga os Blocos da Semana
                </h4>
                <p className="text-gray-500 dark:text-gray-400 leading-relaxed">
                  No quadro <b>Seu Ciclo Prático</b>, o sistema gera os blocos semanais de cada matéria. Sempre que você salvar um estudo lá no <b>Dashboard</b>, os blocos daqui são <b>marcados automaticamente</b>.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Barra de Equilíbrio Básicos vs Específicos */}
        {materias.length > 0 && (
          <div className="mt-6 pt-4 border-t dark:border-gray-700">
            <div className="flex justify-between text-xs font-black mb-1.5">
              <span className="text-blue-500">
                📘 Conhecimentos Básicos: {Math.round(percBasicos)}% ({((percBasicos / 100) * horasSemanais).toFixed(1)}h)
              </span>
              <span className="text-purple-500">
                🎯 Conhecimentos Específicos: {Math.round(percEspecificos)}% ({((percEspecificos / 100) * horasSemanais).toFixed(1)}h)
              </span>
            </div>
            <div className="w-full h-3 bg-gray-200 dark:bg-gray-900 rounded-full overflow-hidden flex">
              <div className="bg-blue-500 h-full transition-all" style={{ width: `${percBasicos}%` }}></div>
              <div className="bg-purple-600 h-full transition-all" style={{ width: `${percEspecificos}%` }}></div>
            </div>
          </div>
        )}
      </div>

      {/* Quadro Interativo do Ciclo de Estudos */}
      {planejamentoFinal.length > 0 && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border dark:border-gray-700 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div>
              <h3 className="text-lg font-black text-gray-800 dark:text-white flex items-center gap-2">
                <span>1. Seu Ciclo Prático de Blocos ({duracaoBlocoMin} min cada)</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 font-black">
                  {totalBlocosFeitos}/{totalBlocosSemana} concluídos ({progressoCicloPerc}%)
                </span>
              </h3>
              <p className="text-xs text-gray-400">
                Os blocos são ticados automaticamente ao concluir estudos no Dashboard (ou clique neles manualmente).
              </p>
            </div>
            <button
              onClick={reiniciarCicloCheckboxes}
              className="text-xs font-black text-indigo-500 hover:bg-indigo-50 dark:hover:bg-gray-700 px-3 py-2 rounded-xl border border-indigo-500/30 transition flex items-center gap-1.5 self-start sm:self-auto"
            >
              <i className="fa-solid fa-rotate"></i> Reiniciar Semana / Ciclo
            </button>
          </div>

          <div className="w-full h-2.5 bg-gray-100 dark:bg-gray-900 rounded-full overflow-hidden mb-6">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500"
              style={{ width: `${progressoCicloPerc}%` }}
            ></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {planejamentoFinal.map((m) => {
              const blocosArray = Array.from({ length: m.qtdBlocos });
              const minAcumulados = configPlan.minutosNoCiclo?.[m.nome] || 0;

              return (
                <div
                  key={m.indexOriginal}
                  className="p-4 rounded-xl bg-gray-50 dark:bg-gray-900 border dark:border-gray-700 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex justify-between items-start gap-2 mb-1">
                      <h4 className="font-black text-sm text-gray-800 dark:text-white">{m.nome}</h4>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black shrink-0 ${m.estrategia.cor}`}>
                        {m.estrategia.label}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-400 mb-3">
                      Meta: <b>{m.horasAlocadas.toFixed(1)}h/sem</b> ({m.qtdBlocos} blocos)
                      {minAcumulados > 0 && (
                        <span className="text-emerald-500 font-bold ml-1">
                          • {minAcumulados} min feitos no ciclo
                        </span>
                      )}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-2 border-t dark:border-gray-800">
                    {blocosArray.map((_, idxBloco) => {
                      const chave = `${m.nome}_${idxBloco}`;
                      const feito = !!configPlan.blocosConcluidos?.[chave];
                      return (
                        <button
                          key={idxBloco}
                          onClick={() => toggleBlocoCiclo(m.nome, idxBloco)}
                          title={feito ? 'Bloco concluído! Clique para desmarcar' : 'Clique para marcar manualmente'}
                          className={`px-3 py-1.5 rounded-lg text-xs font-black border transition flex items-center gap-1.5 ${
                            feito
                              ? 'bg-emerald-600 border-emerald-500 text-white shadow-sm'
                              : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-indigo-500'
                          }`}
                        >
                          <i className={`fa-solid ${feito ? 'fa-check' : 'fa-clock'}`}></i>
                          {duracaoBlocoMin}m
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tabela de Calibragem de Pesos por Matéria */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border dark:border-gray-700 shadow-sm">
        <div className="mb-4">
          <h3 className="text-lg font-black text-gray-800 dark:text-white">
            2. Configurar Pesos das Matérias no Edital
          </h3>
          <p className="text-xs text-gray-400">
            Ajuste os parâmetros abaixo para recalcular automaticamente a quantidade de blocos de cada matéria acima.
          </p>
        </div>

        {materias.length === 0 ? (
          <p className="text-sm text-gray-400">
            Cadastre suas matérias na aba <b>Meu Edital</b> para gerar o planejamento automático.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b dark:border-gray-700 text-[11px] font-black text-gray-400 uppercase">
                  <th className="py-3 px-3">Disciplina</th>
                  <th className="py-3 px-3">Tipo no Edital</th>
                  <th className="py-3 px-3 text-center">Nº Questões / Proporção</th>
                  <th className="py-3 px-3 text-center">Peso da Questão</th>
                  <th className="py-3 px-3">Importância na Banca</th>
                  <th className="py-3 px-3">Seu Nível Atual</th>
                  <th className="py-3 px-3 text-right">Tempo Sugerido</th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-gray-700 text-xs font-bold">
                {planejamentoFinal.map((m) => (
                  <tr key={m.indexOriginal} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                    <td className="py-3 px-3 font-black text-sm text-gray-800 dark:text-white">
                      {m.nome}
                    </td>

                    <td className="py-3 px-3">
                      <select
                        value={m.categoria}
                        onChange={(e) => atualizarParametroMateria(m.indexOriginal, 'categoria', e.target.value)}
                        className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-900 border dark:border-gray-700 dark:text-white"
                      >
                        <option value="basico">📘 Conhec. Básico</option>
                        <option value="especifico">🎯 Conhec. Específico (+20%)</option>
                      </select>
                    </td>

                    <td className="py-3 px-3 text-center">
                      <input
                        type="number"
                        min="1"
                        max="120"
                        value={m.qtdQuestoes}
                        onChange={(e) => atualizarParametroMateria(m.indexOriginal, 'qtdQuestoes', Number(e.target.value))}
                        className="w-16 p-1.5 text-center rounded-lg bg-gray-100 dark:bg-gray-900 border dark:border-gray-700 dark:text-white"
                      />
                    </td>

                    <td className="py-3 px-3 text-center">
                      <input
                        type="number"
                        min="0.5"
                        max="10"
                        step="0.5"
                        value={m.pesoProva}
                        onChange={(e) => atualizarParametroMateria(m.indexOriginal, 'pesoProva', Number(e.target.value))}
                        className="w-16 p-1.5 text-center rounded-lg bg-gray-100 dark:bg-gray-900 border dark:border-gray-700 dark:text-white"
                      />
                    </td>

                    <td className="py-3 px-3">
                      <select
                        value={m.incidencia}
                        onChange={(e) => atualizarParametroMateria(m.indexOriginal, 'incidenciaBanca', e.target.value)}
                        className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-900 border dark:border-gray-700 dark:text-white"
                      >
                        {Object.entries(PESOS_INCIDENCIA).map(([k, val]) => (
                          <option key={k} value={k}>{val.label}</option>
                        ))}
                      </select>
                    </td>

                    <td className="py-3 px-3">
                      <select
                        value={m.nivelDominio || 'auto'}
                        onChange={(e) => atualizarParametroMateria(m.indexOriginal, 'nivelDominio', e.target.value)}
                        className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-900 border dark:border-gray-700 dark:text-white"
                      >
                        <option value="auto">
                          🤖 Automático ({PESOS_DOMINIO[m.dominioKey]?.label.split(' ')[0]})
                        </option>
                        {Object.entries(PESOS_DOMINIO).map(([k, val]) => (
                          <option key={k} value={k}>{val.label}</option>
                        ))}
                      </select>
                    </td>

                    <td className="py-3 px-3 text-right font-black text-indigo-600 dark:text-indigo-400 text-sm">
                      {m.horasAlocadas.toFixed(1)}h ({m.qtdBlocos} {m.qtdBlocos === 1 ? 'bloco' : 'blocos'})
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}