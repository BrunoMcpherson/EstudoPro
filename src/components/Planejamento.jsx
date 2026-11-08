import React, { useState } from 'react';
import { useData } from '../context/DataContext';

const PESOS_INCIDENCIA = {
  baixa: { label: 'Baixa (0.8x)', fator: 0.8 },
  media: { label: 'Média (1.0x)', fator: 1.0 },
  alta: { label: 'Alta (1.25x)', fator: 1.25 },
  altissima: { label: 'Altíssima / Core (1.5x)', fator: 1.5 }
};

const PESOS_DOMINIO = {
  iniciante: { label: 'Iniciante / Base (1.5x)', fator: 1.5 },
  intermediario: { label: 'Intermediário (1.15x)', fator: 1.15 },
  avancado: { label: 'Avançado / Manutenção (0.8x)', fator: 0.8 }
};

export default function Planejamento() {
  const { dadosEstudo, salvarDados } = useData();

  const materias = dadosEstudo?.materias || [];
  const configPlan = dadosEstudo?.configPlanejamento || {
    horasSemanais: 24,
    duracaoBlocoMin: 60,
    blocosConcluidos: {}
  };

  const [horasSemanais, setHorasSemanais] = useState(configPlan.horasSemanais || 24);
  const [duracaoBlocoMin, setDuracaoBlocoMin] = useState(configPlan.duracaoBlocoMin || 60);

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

  // Cálculo do IRP (Índice de Relevância e Prioridade) para cada matéria
  const materiasCalculadas = materias.map((m, index) => {
    const categoria = m.categoria || 'especifico'; // 'basico' | 'especifico'
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

      // Classificação Estratégica
      let estrategia = { label: '⚡ Consolidação', cor: 'text-yellow-500 bg-yellow-500/10' };
      if (percentual >= 14 && m.dominioKey === 'iniciante') {
        estrategia = { label: '🔥 Ataque Máximo', cor: 'text-red-500 bg-red-500/10' };
      } else if (m.dominioKey === 'avancado') {
        estrategia = { label: '🔄 Manutenção / Questões', cor: 'text-emerald-500 bg-emerald-500/10' };
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
    await salvarDados({
      ...dadosEstudo,
      configPlanejamento: {
        ...configPlan,
        blocosConcluidos: {}
      }
    });
  }

  const percBasicos = planejamentoFinal
    .filter((m) => m.categoria === 'basico')
    .reduce((acc, m) => acc + m.percentual, 0);
  const percEspecificos = 100 - percBasicos;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Cabeçalho e Parâmetros da Semana */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border dark:border-gray-700 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-black uppercase text-indigo-500">
              Algoritmo de Priorização (IRP)
            </span>
            <h2 className="text-2xl font-black text-gray-800 dark:text-white">
              Planejamento Estratégico e Ciclo de Estudos
            </h2>
            <p className="text-xs text-gray-400 mt-1">
              Calibra sua carga horária cruzando Peso da Prova, Questões, Incidência da Banca e seu Nível atual.
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
                Bloco do Ciclo
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

      {/* Tabela de Calibragem de Pesos por Matéria */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border dark:border-gray-700 shadow-sm">
        <h3 className="text-lg font-black text-gray-800 dark:text-white mb-4">
          1. Matriz de Pesos e Diagnóstico do Edital
        </h3>

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
                  <th className="py-3 px-3">Bloco do Edital</th>
                  <th className="py-3 px-3 text-center">Questões</th>
                  <th className="py-3 px-3 text-center">Peso</th>
                  <th className="py-3 px-3">Incidência na Banca</th>
                  <th className="py-3 px-3">Seu Domínio</th>
                  <th className="py-3 px-3 text-center">Prioridade</th>
                  <th className="py-3 px-3 text-right">Carga / Sem.</th>
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
                        <option value="basico">📘 Básico (1.0x)</option>
                        <option value="especifico">🎯 Específico (1.2x)</option>
                      </select>
                    </td>

                    <td className="py-3 px-3 text-center">
                      <input
                        type="number"
                        min="1"
                        max="120"
                        value={m.qtdQuestoes}
                        onChange={(e) => atualizarParametroMateria(m.indexOriginal, 'qtdQuestoes', Number(e.target.value))}
                        className="w-14 p-1.5 text-center rounded-lg bg-gray-100 dark:bg-gray-900 border dark:border-gray-700 dark:text-white"
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
                        className="w-14 p-1.5 text-center rounded-lg bg-gray-100 dark:bg-gray-900 border dark:border-gray-700 dark:text-white"
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
                        <option value="auto">🤖 Auto ({PESOS_DOMINIO[m.dominioKey]?.label.split(' ')[0]})</option>
                        {Object.entries(PESOS_DOMINIO).map(([k, val]) => (
                          <option key={k} value={k}>{val.label}</option>
                        ))}
                      </select>
                    </td>

                    <td className="py-3 px-3 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-[11px] font-black ${m.estrategia.cor}`}>
                        {m.estrategia.label}
                      </span>
                    </td>

                    <td className="py-3 px-3 text-right font-black text-indigo-600 dark:text-indigo-400 text-sm">
                      {m.horasAlocadas.toFixed(1)}h ({Math.round(m.percentual)}%)
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quadro Interativo do Ciclo de Estudos */}
      {planejamentoFinal.length > 0 && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border dark:border-gray-700 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-black text-gray-800 dark:text-white">
                2. Seu Ciclo Prático de Blocos ({duracaoBlocoMin} min por bloco)
              </h3>
              <p className="text-xs text-gray-400">
                Marque os blocos conforme for concluindo ao longo da semana para manter o giro equilibrado do edital.
              </p>
            </div>
            <button
              onClick={reiniciarCicloCheckboxes}
              className="text-xs font-black text-indigo-500 hover:bg-indigo-50 dark:hover:bg-gray-700 px-3 py-2 rounded-xl transition flex items-center gap-1.5"
            >
              <i className="fa-solid fa-rotate"></i> Reiniciar Giro do Ciclo
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {planejamentoFinal.map((m) => {
              const blocosArray = Array.from({ length: m.qtdBlocos });
              return (
                <div
                  key={m.indexOriginal}
                  className="p-4 rounded-xl bg-gray-50 dark:bg-gray-900 border dark:border-gray-700 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex justify-between items-start gap-2 mb-2">
                      <h4 className="font-black text-sm text-gray-800 dark:text-white">{m.nome}</h4>
                      <span className="text-[11px] font-black text-indigo-500 shrink-0">
                        {m.qtdBlocos} {m.qtdBlocos === 1 ? 'bloco' : 'blocos'}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-400 mb-3">
                      Meta semanal: <b>{m.horasAlocadas.toFixed(1)}h</b> • Pontos em jogo: <b>{m.pontosBrutos} pts</b>
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
    </div>
  );
}