import React from 'react';
import { useData } from '../context/DataContext';

export default function Desempenho() {
  const { dadosEstudo, salvarDados } = useData();

  const materias = dadosEstudo?.materias || [];
  const historicoEstudos = dadosEstudo?.historicoEstudos || [];

  // Calcula o tempo de cada matéria consolidando materia.tempo ou historicoEstudos
  const obterMinutosMateria = (materia) => {
    if (typeof materia.tempo === 'number') return materia.tempo;
    return historicoEstudos
      .filter((h) => h.materia === materia.nome)
      .reduce((acc, cur) => acc + (Number(cur.minutos) || 0), 0);
  };

  const totalMinutosTodasMaterias = materias.reduce((acc, m) => acc + obterMinutosMateria(m), 0);

  // Função que reseta TANTO questões QUANTO o tempo e o gráfico da matéria
  async function resetarMateriaCompleta(indexMateria) {
    const materiaAlvo = materias[indexMateria];
    if (!materiaAlvo) return;

    const confirmar = window.confirm(
      `Deseja zerar TODO o histórico de "${materiaAlvo.nome}" (Questões, Acertos, Erros e Tempo de Estudo no gráfico)?`
    );
    if (!confirmar) return;

    const minutosParaRemover = obterMinutosMateria(materiaAlvo);
    const acertosParaRemover = materiaAlvo.acertos || 0;
    const errosParaRemover = materiaAlvo.erros || 0;

    // 1. Zera os contadores dentro da matéria
    const novasMaterias = materias.map((m, i) =>
      i === indexMateria
        ? { ...m, tempo: 0, acertos: 0, erros: 0, paginas: 0 }
        : m
    );

    // 2. Remove os logs de tempo dessa matéria no historicoEstudos (para zerar gráficos baseados em log)
    const novoHistoricoEstudos = historicoEstudos.filter(
      (reg) => reg.materia !== materiaAlvo.nome
    );

    // 3. Atualiza os totais globais sem deixar ficar negativo
    const novoTempoTotal = Math.max(0, (dadosEstudo?.tempoTotal || 0) - minutosParaRemover);
    const novosAcertosGerais = Math.max(0, (dadosEstudo?.questoesGerais?.acertos || 0) - acertosParaRemover);
    const novosErrosGerais = Math.max(0, (dadosEstudo?.questoesGerais?.erros || 0) - errosParaRemover);

    await salvarDados({
      ...dadosEstudo,
      materias: novasMaterias,
      historicoEstudos: novoHistoricoEstudos,
      tempoTotal: novoTempoTotal,
      questoesGerais: {
        acertos: novosAcertosGerais,
        erros: novosErrosGerais
      }
    });
  }

  const formatarHoras = (min) => {
    const h = Math.floor(min / 60);
    const m = min % 60;
    return `${h}h ${m}m`;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Gráfico de Distribuição de Tempo por Matéria */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border dark:border-gray-700 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-black text-gray-800 dark:text-white">
              Tempo de Estudo por Matéria
            </h2>
            <p className="text-xs text-gray-400">
              Distribuição proporcional da sua carga horária acumulada
            </p>
          </div>
          <span className="text-sm font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-gray-900 px-3 py-1.5 rounded-xl">
            Total: {formatarHoras(totalMinutosTodasMaterias)}
          </span>
        </div>

        {materias.length === 0 ? (
          <p className="text-sm text-gray-400 py-4">Nenhuma matéria cadastrada ainda.</p>
        ) : (
          <div className="space-y-3">
            {materias.map((m, idx) => {
              const min = obterMinutosMateria(m);
              const perc = totalMinutosTodasMaterias > 0
                ? Math.round((min / totalMinutosTodasMaterias) * 100)
                : 0;

              return (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-gray-700 dark:text-gray-200">{m.nome}</span>
                    <span className="text-gray-500 dark:text-gray-400">
                      {formatarHoras(min)} ({perc}%)
                    </span>
                  </div>
                  <div className="w-full h-3 bg-gray-100 dark:bg-gray-900 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500"
                      style={{ width: `${perc}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Tabela de Rendimento (Questões + Tempo + Botão de Reset Completo) */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border dark:border-gray-700 shadow-sm">
        <h2 className="text-xl font-black text-gray-800 dark:text-white mb-4">
          Rendimento Detalhado por Disciplina
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b dark:border-gray-700 text-xs font-black text-gray-400 uppercase">
                <th className="py-3 px-4">Matéria</th>
                <th className="py-3 px-4 text-center">Tempo</th>
                <th className="py-3 px-4 text-center">Acertos</th>
                <th className="py-3 px-4 text-center">Erros</th>
                <th className="py-3 px-4 text-center">Aproveitamento</th>
                <th className="py-3 px-4 text-right">Resetar</th>
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-gray-700 text-sm font-bold">
              {materias.map((m, idx) => {
                const acertos = m.acertos || 0;
                const erros = m.erros || 0;
                const totalQ = acertos + erros;
                const taxa = totalQ > 0 ? Math.round((acertos / totalQ) * 100) : 0;
                const minutos = obterMinutosMateria(m);

                return (
                  <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700/40 transition">
                    <td className="py-3.5 px-4 text-gray-800 dark:text-white">{m.nome}</td>
                    <td className="py-3.5 px-4 text-center text-indigo-600 dark:text-indigo-400">
                      {formatarHoras(minutos)}
                    </td>
                    <td className="py-3.5 px-4 text-center text-emerald-500">{acertos}</td>
                    <td className="py-3.5 px-4 text-center text-red-500">{erros}</td>
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`px-2.5 py-1 rounded-lg text-xs font-black ${
                          totalQ === 0
                            ? 'bg-gray-100 dark:bg-gray-900 text-gray-400'
                            : taxa >= 80
                            ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400'
                            : taxa >= 60
                            ? 'bg-yellow-100 dark:bg-yellow-950 text-yellow-600 dark:text-yellow-400'
                            : 'bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400'
                        }`}
                      >
                        {totalQ > 0 ? `${taxa}%` : 'Sem dados'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => resetarMateriaCompleta(idx)}
                        title="Zerar tempo e questões desta matéria"
                        className="text-gray-400 hover:text-red-500 p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 transition"
                      >
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