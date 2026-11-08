import React, { useState } from 'react';
import { useData } from '../context/DataContext';

const PESOS_INCIDENCIA = {
  baixa: { label: 'Pouco Cobrado (0.8x)', fator: 0.8 },
  media: { label: 'Cobrança Normal (1.0x)', fator: 1.0 },
  alta: { label: 'Muito Cobrado (1.3x)', fator: 1.3 },
  altissima: { label: 'Core da Banca (1.6x)', fator: 1.6 }
};

const PESOS_DOMINIO = {
  iniciante: { label: 'Iniciante (Preciso de Base)', fator: 1.5 },
  intermediario: { label: 'Intermediário (Evoluindo)', fator: 1.15 },
  avancado: { label: 'Avançado (Só Revisão/Questões)', fator: 0.8 }
};

const STORAGE_AI_KEY = 'estudopro_ai_api_key';
const STORAGE_AI_PROVIDER = 'estudopro_ai_provider';

export default function Planejamento() {
  const { dadosEstudo, salvarDados } = useData();

  const materias = dadosEstudo?.materias || [];
  const configPlan = dadosEstudo?.configPlanejamento || {
    horasSemanais: 24,
    duracaoBlocoMin: 60,
    banca: 'Vunesp',
    cargoOrgao: 'Analista de Sistemas - TRF 3',
    questoesBasicasTotal: 20,
    pesoBasicas: 1,
    questoesEspecificasTotal: 40,
    pesoEspecificas: 2,
    modoDistribuicao: 'bloco',
    blocosConcluidos: {},
    minutosNoCiclo: {},
    ocultarTutorial: false
  };

  const [horasSemanais, setHorasSemanais] = useState(configPlan.horasSemanais ?? 24);
  const [duracaoBlocoMin, setDuracaoBlocoMin] = useState(configPlan.duracaoBlocoMin ?? 60);
  const [banca, setBanca] = useState(configPlan.banca ?? 'Vunesp');
  const [cargoOrgao, setCargoOrgao] = useState(configPlan.cargoOrgao ?? '');
  const [questoesBasicasTotal, setQuestoesBasicasTotal] = useState(configPlan.questoesBasicasTotal ?? 20);
  const [pesoBasicas, setPesoBasicas] = useState(configPlan.pesoBasicas ?? 1);
  const [questoesEspecificasTotal, setQuestoesEspecificasTotal] = useState(configPlan.questoesEspecificasTotal ?? 40);
  const [pesoEspecificas, setPesoEspecificas] = useState(configPlan.pesoEspecificas ?? 2);
  const [modoDistribuicao, setModoDistribuicao] = useState(configPlan.modoDistribuicao ?? 'bloco');

  const [mostrarTutorial, setMostrarTutorial] = useState(!configPlan.ocultarTutorial);
  const [modalIaAberto, setModalIaAberto] = useState(false);
  const [provedorIa, setProvedorIa] = useState(
    () => localStorage.getItem(STORAGE_AI_PROVIDER) || 'groq'
  );
  const [apiKeyInput, setApiKeyInput] = useState(
    () => localStorage.getItem(STORAGE_AI_KEY) || ''
  );
  const [analisandoIa, setAnalisandoIa] = useState(false);
  const [erroIa, setErroIa] = useState('');

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

  const materiasComPesoBloco = materias.map((m, index) => {
    const categoria = m.categoria || 'especifico';
    const incidencia = m.incidenciaBanca || 'media';
    const fatorInc = PESOS_INCIDENCIA[incidencia]?.fator || 1.0;
    const qtdTopicos = (m.topicos || []).length;
    const fatorTamanhoEdital = Math.sqrt(Math.max(4, qtdTopicos));
    const pesoRelativoNoBloco = fatorTamanhoEdital * fatorInc;

    return {
      ...m,
      indexOriginal: index,
      categoria,
      incidencia,
      fatorInc,
      qtdTopicos,
      pesoRelativoNoBloco
    };
  });

  const somaPesoBasico = materiasComPesoBloco
    .filter((m) => m.categoria === 'basico')
    .reduce((acc, m) => acc + m.pesoRelativoNoBloco, 0);

  const somaPesoEspecifico = materiasComPesoBloco
    .filter((m) => m.categoria === 'especifico')
    .reduce((acc, m) => acc + m.pesoRelativoNoBloco, 0);

  const materiasCalculadas = materiasComPesoBloco.map((m) => {
    const dominioKey = obterDominioEfetivo(m);
    const fatorDom = PESOS_DOMINIO[dominioKey]?.fator || 1.15;

    let qtdQuestoes = Number(m.qtdQuestoes) || 10;
    let pesoProva = Number(m.pesoProva) || 1;

    if (modoDistribuicao === 'bloco') {
      if (m.categoria === 'basico') {
        pesoProva = Number(pesoBasicas) || 1;
        const proporcao = somaPesoBasico > 0 ? m.pesoRelativoNoBloco / somaPesoBasico : 0;
        qtdQuestoes = Math.max(1, Math.round(questoesBasicasTotal * proporcao));
      } else {
        pesoProva = Number(pesoEspecificas) || 2;
        const proporcao = somaPesoEspecifico > 0 ? m.pesoRelativoNoBloco / somaPesoEspecifico : 0;
        qtdQuestoes = Math.max(1, Math.round(questoesEspecificasTotal * proporcao));
      }
    }

    const fatorCat = m.categoria === 'especifico' ? 1.2 : 1.0;
    const pontosBrutos = qtdQuestoes * pesoProva;
    const irp = pontosBrutos * fatorCat * m.fatorInc * fatorDom;

    return {
      ...m,
      qtdQuestoes,
      pesoProva,
      dominioKey,
      pontosBrutos,
      irp
    };
  });

  const somaIrpTotal = materiasCalculadas.reduce((acc, m) => acc + m.irp, 0);

  const planejamentoFinal = materiasCalculadas
    .map((m) => {
      const percentual = somaIrpTotal > 0 ? (m.irp / somaIrpTotal) * 100 : 0;
      const horasAlocadas = (percentual / 100) * horasSemanais;
      const minutosAlocados = Math.round(horasAlocadas * 60);
      const qtdBlocos = Math.max(1, Math.round(minutosAlocados / duracaoBlocoMin));

      let estrategia = { label: '⚡ Ritmo Constante', cor: 'text-yellow-500 bg-yellow-500/10' };
      if (percentual >= 14 && m.dominioKey === 'iniciante') {
        estrategia = { label: '🔥 Ataque Máximo', cor: 'text-red-500 bg-red-500/10' };
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

  async function salvarConfiguracaoGeral(novosCampos) {
    const novaConfig = {
      ...configPlan,
      horasSemanais,
      duracaoBlocoMin,
      banca,
      cargoOrgao,
      questoesBasicasTotal,
      pesoBasicas,
      questoesEspecificasTotal,
      pesoEspecificas,
      modoDistribuicao,
      ...novosCampos
    };
    await salvarDados({
      ...dadosEstudo,
      configPlanejamento: novaConfig
    });
  }

  async function atualizarParametroMateria(indexOriginal, campo, valor) {
    const novasMaterias = [...materias];
    novasMaterias[indexOriginal] = {
      ...novasMaterias[indexOriginal],
      [campo]: valor
    };
    await salvarDados({ ...dadosEstudo, materias: novasMaterias });
  }

  // OPÇÃO 1: MOTOR ESTATÍSTICO LOCAL (NÃO PRECISA DE CHAVE DE API)
  async function executarRaioXLocalSemChave() {
    if (materias.length === 0) {
      setErroIa('Cadastre suas matérias na aba "Meu Edital" primeiro.');
      return;
    }

    const regexBasicas = /portugu|racioc|lógic|informátic|atualidades|inglês|ética|constitucional|administrativo/i;
    const regexCore = /portugu|específic|ti|sistema|dados|segurança|redes|desenvolvimento|software|engenharia|direito|auditoria|contabilidade/i;
    const regexAltaPrioridadeTopico = /segurança|redes|banco de dados|sql|arquitetura|engenharia|scrum|ágil|cloud|nuvem|linux|windows|python|java|api|constitucional|administrativo|licita|4\.133|sintaxe|crase|interpretação|concordância|regência|lógica|proposiç|estatística/i;

    const bancaNorm = (banca || 'Banca').trim();

    const novasMaterias = materias.map((mat) => {
      const nomeMat = mat.nome || '';
      const ehBasica = regexBasicas.test(nomeMat);
      const categoria = ehBasica ? 'basico' : 'especifico';

      const listaTopicos = (mat.topicos || []).map((t) => t.nome);
      let incidenciaBanca = 'media';

      if (/portugu/i.test(nomeMat) || (!ehBasica && listaTopicos.length >= 8)) {
        incidenciaBanca = 'altissima';
      } else if (regexCore.test(nomeMat) || listaTopicos.length >= 5) {
        incidenciaBanca = 'alta';
      }

      // Seleciona os tópicos mais cobrados com base nas palavras-chave de alta incidência
      let topicosQuentes = listaTopicos.filter((t) => regexAltaPrioridadeTopico.test(t)).slice(0, 4);
      if (topicosQuentes.length === 0 && listaTopicos.length > 0) {
        topicosQuentes = listaTopicos.slice(0, Math.min(3, listaTopicos.length));
      }

      let estiloBanca = `Foco em resolução de questões recentes da ${bancaNorm} e revisão dos tópicos centrais.`;
      if (/vunesp/i.test(bancaNorm)) {
        estiloBanca = ehBasica
          ? 'Vunesp cobra literalidade, interpretação direta e gramática normativa clássica.'
          : 'Vunesp foca em conceitos diretos do edital, comandos práticos e padrões de projeto/normas.';
      } else if (/cebraspe|cespe/i.test(bancaNorm)) {
        estiloBanca = 'Cebraspe exige atenção a pegadinhas conceituais, jurisprudência e casos práticos.';
      } else if (/fgv/i.test(bancaNorm)) {
        estiloBanca = 'FGV cobra estudos de caso extensos, interpretação avançada e aplicação prática.';
      } else if (/fcc/i.test(bancaNorm)) {
        estiloBanca = 'FCC valoriza velocidade de prova, domínio técnico amplo do edital e letra da norma.';
      }

      return {
        ...mat,
        categoria,
        incidenciaBanca,
        pesoProva: categoria === 'basico' ? Number(pesoBasicas) : Number(pesoEspecificas),
        resumoCobranca: estiloBanca,
        topicosQuentes
      };
    });

    await salvarDados({
      ...dadosEstudo,
      materias: novasMaterias,
      configPlanejamento: {
        ...configPlan,
        banca,
        cargoOrgao,
        questoesBasicasTotal,
        pesoBasicas,
        questoesEspecificasTotal,
        pesoEspecificas,
        modoDistribuicao: 'bloco'
      }
    });

    setModoDistribuicao('bloco');
    setModalIaAberto(false);
  }

  // OPÇÃO 2: MOTOR DE IA (SUPORTA GROQ GRATUITO OU GEMINI COM HEADER X-GOOG-API-KEY)
  async function executarRaioXBancaIA(e) {
    e.preventDefault();
    setErroIa('');

    const chaveLimpa = apiKeyInput.trim();
    if (!chaveLimpa) {
      setErroIa('Cole sua chave de API ou clique no botão "Calibrar sem Chave (Instantâneo)" abaixo.');
      return;
    }

    if (materias.length === 0) {
      setErroIa('Cadastre suas matérias na aba "Meu Edital" antes de rodar a análise.');
      return;
    }

    // Detecta automaticamente se o usuário colou uma chave da Groq (gsk_...)
    const provedorEfetivo = chaveLimpa.startsWith('gsk_') ? 'groq' : provedorIa;

    localStorage.setItem(STORAGE_AI_KEY, chaveLimpa);
    localStorage.setItem(STORAGE_AI_PROVIDER, provedorEfetivo);
    setAnalisandoIa(true);

    try {
      const resumoEdital = materias.map((m, idx) => ({
        index: idx,
        nome: m.nome,
        amostraTopicos: (m.topicos || []).slice(0, 35).map((t) => t.nome)
      }));

      const promptSistema = `
Você é um especialista em estatística de concursos públicos brasileiros.
Analise a prova abaixo com base no histórico de provas anteriores dessa banca para esse cargo/área:
- Banca Organizadora: "${banca}"
- Cargo / Órgão: "${cargoOrgao || dadosEstudo?.concursos?.[0]?.nome || 'Concurso Público'}"
- Total de Questões de Conhecimentos Básicos no Edital: ${questoesBasicasTotal} (Peso ${pesoBasicas})
- Total de Questões de Conhecimentos Específicos no Edital: ${questoesEspecificasTotal} (Peso ${pesoEspecificas})

Matérias e tópicos cadastrados pelo aluno:
${JSON.stringify(resumoEdital)}

Retorne APENAS um objeto JSON válido (sem blocos markdown) no seguinte formato exato:
{
  "analiseMaterias": [
    {
      "index": 0,
      "categoria": "basico" ou "especifico",
      "incidenciaBanca": "baixa" | "media" | "alta" | "altissima",
      "questoesEstimadas": numero_inteiro,
      "resumoCobranca": "frase curta de até 140 caracteres explicando o estilo e foco da banca nessa matéria",
      "topicosQuentes": ["até 4 assuntos dessa matéria que mais caem historicamente nessa banca"]
    }
  ]
}`;

      let textoJson = '';

      if (provedorEfetivo === 'groq') {
        const respGroq = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${chaveLimpa}`
          },
          body: JSON.stringify({
            model: 'llama3-8b-8192', // <-- MODELO UNIVERSAL 100% GARANTIDO NA GROQ
            messages: [
              { role: 'system', content: 'Você é um assistente que responde apenas em formato JSON válido.' },
              { role: 'user', content: promptSistema + '\nLembre-se: retorne apenas JSON estruturado.' }
            ],
            response_format: { type: 'json_object' },
            temperature: 0.1
          })
        });

        if (!respGroq.ok) {
          const groqError = await respGroq.json();
          console.error("Erro detalhado da Groq:", groqError);
          const msgReal = groqError.error?.message || 'Erro de conexão com a Groq';
          throw new Error(`Groq recusou: ${msgReal}`);
        }
        const dataGroq = await respGroq.json();
        textoJson = dataGroq?.choices?.[0]?.message?.content;

      } else {
        // Chamada Gemini enviando tanto no header x-goog-api-key quanto com fallback de modelos
        const modelosGemini = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash-latest'];
        let ultimoStatus = 401;

        for (const mod of modelosGemini) {
          const respGem = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${mod}:generateContent`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-goog-api-key': chaveLimpa
              },
              body: JSON.stringify({
                contents: [{ parts: [{ text: promptSistema }] }],
                generationConfig: {
                  responseMimeType: 'application/json',
                  temperature: 0.2
                }
              })
            }
          );

          if (respGem.ok) {
            const dataGem = await respGem.json();
            textoJson = dataGem?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (textoJson) break;
          } else {
            ultimoStatus = respGem.status;
          }
        }

        if (!textoJson) {
          if (chaveLimpa.startsWith('AQ.')) {
            throw new Error(
              `Erro ${ultimoStatus}: Chaves iniciadas com "AQ." são tokens restritos de projeto Cloud. Use uma chave gratuita da Groq (gsk_...) na aba acima ou clique em "Calibrar sem Chave".`
            );
          }
          throw new Error(`Erro na API Gemini (${ultimoStatus}). Use a opção Groq (Gratuita) ou o botão Local abaixo.`);
        }
      }

      const parseado = JSON.parse(textoJson);
      const listaAnalisada = parseado.analiseMaterias || [];

      const novasMaterias = materias.map((mat, idx) => {
        const itemIa = listaAnalisada.find((x) => Number(x.index) === idx);
        if (!itemIa) return mat;

        const cat = itemIa.categoria === 'basico' ? 'basico' : 'especifico';
        return {
          ...mat,
          categoria: cat,
          incidenciaBanca: ['baixa', 'media', 'alta', 'altissima'].includes(itemIa.incidenciaBanca)
            ? itemIa.incidenciaBanca
            : 'media',
          qtdQuestoes: Number(itemIa.questoesEstimadas) || mat.qtdQuestoes || 5,
          pesoProva: cat === 'basico' ? Number(pesoBasicas) : Number(pesoEspecificas),
          resumoCobranca: itemIa.resumoCobranca || '',
          topicosQuentes: Array.isArray(itemIa.topicosQuentes) ? itemIa.topicosQuentes : []
        };
      });

      await salvarDados({
        ...dadosEstudo,
        materias: novasMaterias,
        configPlanejamento: {
          ...configPlan,
          banca,
          cargoOrgao,
          questoesBasicasTotal,
          pesoBasicas,
          questoesEspecificasTotal,
          pesoEspecificas
        }
      });

      setModalIaAberto(false);
    } catch (err) {
      console.error('Erro no Raio-X da Banca:', err);
      setErroIa(err.message || 'Falha ao consultar a IA.');
    } finally {
      setAnalisandoIa(false);
    }
  }

  async function toggleBlocoCiclo(nomeMateria, idxBloco) {
    const chave = `${nomeMateria}_${idxBloco}`;
    const blocosAtuais = { ...(configPlan.blocosConcluidos || {}) };
    blocosAtuais[chave] = !blocosAtuais[chave];

    await salvarConfiguracaoGeral({ blocosConcluidos: blocosAtuais });
  }

  async function reiniciarCicloCheckboxes() {
    if (!window.confirm('Deseja desmarcar todos os blocos para iniciar um novo giro semanal?')) return;
    await salvarConfiguracaoGeral({
      blocosConcluidos: {},
      minutosNoCiclo: {}
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
      {/* 1. Painel Macro da Prova e Botão de Raio-X Histórico da Banca */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border dark:border-gray-700 shadow-sm space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase text-indigo-500">
                Planejamento Macro & Estatística de Banca
              </span>
              <button
                onClick={() => {
                  const novo = !mostrarTutorial;
                  setMostrarTutorial(novo);
                  salvarConfiguracaoGeral({ ocultarTutorial: !novo });
                }}
                className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-200 transition"
              >
                {mostrarTutorial ? 'Ocultar Guia' : 'Como funciona?'}
              </button>
            </div>
            <h2 className="text-2xl font-black text-gray-800 dark:text-white mt-1">
              Ciclo de Estudos por Blocos e Incidência
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Informe apenas o total de questões Básicas e Específicas do edital que o sistema calcula a divisão proporcional.
            </p>
          </div>

          <button
            onClick={() => {
              setErroIa('');
              setModalIaAberto(true);
            }}
            className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-black px-5 py-3 rounded-xl shadow-lg transition flex items-center gap-2.5 self-start lg:self-auto shrink-0"
          >
            <i className="fa-solid fa-wand-magic-sparkles"></i>
            <span>Raio-X Histórico da Banca</span>
          </button>
        </div>

        {/* Configuração Macro dos Blocos do Edital */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 bg-gray-50 dark:bg-gray-900 p-4 rounded-xl border dark:border-gray-700">
          <div>
            <label className="block text-[10px] font-black uppercase text-gray-400">
              Horas / Semana
            </label>
            <input
              type="number"
              min="1"
              max="100"
              value={horasSemanais}
              onChange={(e) => {
                const val = Number(e.target.value) || 20;
                setHorasSemanais(val);
                salvarConfiguracaoGeral({ horasSemanais: val });
              }}
              className="w-full p-2 mt-1 text-center font-black rounded-lg bg-white dark:bg-gray-800 border dark:border-gray-700 dark:text-white text-sm"
            />
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase text-gray-400">
              Duração do Bloco
            </label>
            <select
              value={duracaoBlocoMin}
              onChange={(e) => {
                const val = Number(e.target.value);
                setDuracaoBlocoMin(val);
                salvarConfiguracaoGeral({ duracaoBlocoMin: val });
              }}
              className="w-full p-2 mt-1 font-black rounded-lg bg-white dark:bg-gray-800 border dark:border-gray-700 dark:text-white text-sm"
            >
              <option value={45}>45 min</option>
              <option value={60}>1h (60m)</option>
              <option value={90}>1h 30m</option>
              <option value={120}>2h (120m)</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase text-blue-500">
              📘 Total Questões Básicas
            </label>
            <input
              type="number"
              min="0"
              max="200"
              value={questoesBasicasTotal}
              onChange={(e) => {
                const val = Number(e.target.value) || 0;
                setQuestoesBasicasTotal(val);
                salvarConfiguracaoGeral({ questoesBasicasTotal: val });
              }}
              className="w-full p-2 mt-1 text-center font-black rounded-lg bg-white dark:bg-gray-800 border border-blue-500/30 dark:text-white text-sm"
            />
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase text-blue-500">
              📘 Peso (Básicas)
            </label>
            <input
              type="number"
              min="0.5"
              max="10"
              step="0.5"
              value={pesoBasicas}
              onChange={(e) => {
                const val = Number(e.target.value) || 1;
                setPesoBasicas(val);
                salvarConfiguracaoGeral({ pesoBasicas: val });
              }}
              className="w-full p-2 mt-1 text-center font-black rounded-lg bg-white dark:bg-gray-800 border border-blue-500/30 dark:text-white text-sm"
            />
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase text-purple-500">
              🎯 Total Questões Espec.
            </label>
            <input
              type="number"
              min="0"
              max="200"
              value={questoesEspecificasTotal}
              onChange={(e) => {
                const val = Number(e.target.value) || 0;
                setQuestoesEspecificasTotal(val);
                salvarConfiguracaoGeral({ questoesEspecificasTotal: val });
              }}
              className="w-full p-2 mt-1 text-center font-black rounded-lg bg-white dark:bg-gray-800 border border-purple-500/30 dark:text-white text-sm"
            />
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase text-purple-500">
              🎯 Peso (Específicas)
            </label>
            <input
              type="number"
              min="0.5"
              max="10"
              step="0.5"
              value={pesoEspecificas}
              onChange={(e) => {
                const val = Number(e.target.value) || 1;
                setPesoEspecificas(val);
                salvarConfiguracaoGeral({ pesoEspecificas: val });
              }}
              className="w-full p-2 mt-1 text-center font-black rounded-lg bg-white dark:bg-gray-800 border border-purple-500/30 dark:text-white text-sm"
            />
          </div>
        </div>

        {/* Tutorial rápido */}
        {mostrarTutorial && (
          <div className="p-4 rounded-xl bg-indigo-50/70 dark:bg-gray-900/90 border border-indigo-100 dark:border-indigo-900/50 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div>
              <span className="font-black text-indigo-600 dark:text-indigo-400 block mb-1">
                1. Sem Questões por Matéria?
              </span>
              <p className="text-gray-500 dark:text-gray-400">
                Preencha apenas o <b>Total de Questões Básicas e Específicas</b> acima. O sistema divide as questões entre as disciplinas automaticamente com base na extensão do edital e na importância da matéria.
              </p>
            </div>
            <div>
              <span className="font-black text-purple-600 dark:text-purple-400 block mb-1">
                2. Raio-X Histórico da Banca
              </span>
              <p className="text-gray-500 dark:text-gray-400">
                Clique em <b>Raio-X Histórico da Banca</b> para classificar automaticamente suas matérias (via IA ou via Motor Estatístico Local instantâneo sem precisar de chave).
              </p>
            </div>
            <div>
              <span className="font-black text-emerald-600 dark:text-emerald-400 block mb-1">
                3. Blocos Ticados no Automático
              </span>
              <p className="text-gray-500 dark:text-gray-400">
                Conforme você estuda pelo Pomodoro ou Cronômetro no <b>Dashboard</b>, os blocos da semana abaixo são marcados automaticamente.
              </p>
            </div>
          </div>
        )}

        {/* Barra de Proporção Básicos vs Específicos */}
        {materias.length > 0 && (
          <div className="pt-2">
            <div className="flex justify-between text-xs font-black mb-1.5">
              <span className="text-blue-500">
                📘 Conhecimentos Básicos: {Math.round(percBasicos)}% ({((percBasicos / 100) * horasSemanais).toFixed(1)}h/sem)
              </span>
              <span className="text-purple-500">
                🎯 Conhecimentos Específicos: {Math.round(percEspecificos)}% ({((percEspecificos / 100) * horasSemanais).toFixed(1)}h/sem)
              </span>
            </div>
            <div className="w-full h-3 bg-gray-200 dark:bg-gray-900 rounded-full overflow-hidden flex">
              <div className="bg-blue-500 h-full transition-all" style={{ width: `${percBasicos}%` }}></div>
              <div className="bg-purple-600 h-full transition-all" style={{ width: `${percEspecificos}%` }}></div>
            </div>
          </div>
        )}
      </div>

      {/* 2. Quadro de Blocos Semanais + Assuntos Quentes da Banca */}
      {planejamentoFinal.length > 0 && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border dark:border-gray-700 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div>
              <h3 className="text-lg font-black text-gray-800 dark:text-white flex items-center gap-2">
                <span>1. Seu Ciclo Semanal ({duracaoBlocoMin} min por bloco)</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 font-black">
                  {totalBlocosFeitos}/{totalBlocosSemana} concluídos ({progressoCicloPerc}%)
                </span>
              </h3>
              <p className="text-xs text-gray-400">
                Ordenado da matéria mais estratégica para a de manutenção.
              </p>
            </div>
            <button
              onClick={reiniciarCicloCheckboxes}
              className="text-xs font-black text-indigo-500 hover:bg-indigo-50 dark:hover:bg-gray-700 px-3 py-2 rounded-xl border border-indigo-500/30 transition flex items-center gap-1.5 self-start sm:self-auto"
            >
              <i className="fa-solid fa-rotate"></i> Reiniciar Giro Semanal
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
                  className="p-4 rounded-xl bg-gray-50 dark:bg-gray-900 border dark:border-gray-700 flex flex-col justify-between space-y-3"
                >
                  <div>
                    <div className="flex justify-between items-start gap-2 mb-1">
                      <div>
                        <span className="text-[10px] font-black uppercase text-gray-400">
                          {m.categoria === 'basico' ? '📘 Básico' : '🎯 Específico'} • ~{m.qtdQuestoes} questões
                        </span>
                        <h4 className="font-black text-sm text-gray-800 dark:text-white">{m.nome}</h4>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black shrink-0 ${m.estrategia.cor}`}>
                        {m.estrategia.label}
                      </span>
                    </div>

                    <p className="text-[11px] text-gray-400">
                      Meta: <b>{m.horasAlocadas.toFixed(1)}h/sem</b> ({m.qtdBlocos} blocos)
                      {minAcumulados > 0 && (
                        <span className="text-emerald-500 font-bold ml-1">
                          • {minAcumulados}m estudados
                        </span>
                      )}
                    </p>

                    {m.resumoCobranca && (
                      <p className="mt-2 text-[11px] text-indigo-600 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/40 p-2 rounded-lg border border-indigo-100 dark:border-indigo-900/50">
                        <i className="fa-solid fa-magnifying-glass-chart mr-1"></i>
                        {m.resumoCobranca}
                      </p>
                    )}

                    {Array.isArray(m.topicosQuentes) && m.topicosQuentes.length > 0 && (
                      <div className="mt-2">
                        <span className="block text-[10px] font-black uppercase text-orange-500 mb-1">
                          🔥 Assuntos Prioritários ({banca}):
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {m.topicosQuentes.map((topico, i) => (
                            <span
                              key={i}
                              className="text-[10px] font-bold px-2 py-0.5 rounded bg-orange-500/10 text-orange-600 dark:text-orange-300 border border-orange-500/20"
                            >
                              {topico}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
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

      {/* 3. Tabela de Ajuste Fino por Disciplina */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border dark:border-gray-700 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-lg font-black text-gray-800 dark:text-white">
              2. Matriz de Relevância por Disciplina
            </h3>
            <p className="text-xs text-gray-400">
              No modo <b>Proporcional ao Bloco</b>, o número de questões de cada matéria é estimado automaticamente a partir do total de Básicas ({questoesBasicasTotal}) e Específicas ({questoesEspecificasTotal}).
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs font-bold">
            <span className="text-gray-400">Modo de Questões:</span>
            <select
              value={modoDistribuicao}
              onChange={(e) => {
                setModoDistribuicao(e.target.value);
                salvarConfiguracaoGeral({ modoDistribuicao: e.target.value });
              }}
              className="p-2 rounded-xl bg-gray-100 dark:bg-gray-900 border dark:border-gray-700 dark:text-white font-black"
            >
              <option value="bloco">⚡ Estimar pelo Bloco (Básico/Específico)</option>
              <option value="manual">✍️ Manual por Matéria (ou via IA)</option>
            </select>
          </div>
        </div>

        {materias.length === 0 ? (
          <p className="text-sm text-gray-400">
            Cadastre suas matérias na aba <b>Meu Edital</b> para habilitar a matriz.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b dark:border-gray-700 text-[11px] font-black text-gray-400 uppercase">
                  <th className="py-3 px-3">Disciplina</th>
                  <th className="py-3 px-3">Bloco no Edital</th>
                  <th className="py-3 px-3 text-center">Tópicos</th>
                  <th className="py-3 px-3 text-center">Questões Est.</th>
                  <th className="py-3 px-3">Incidência na Banca</th>
                  <th className="py-3 px-3">Seu Nível</th>
                  <th className="py-3 px-3 text-right">Carga Sugerida</th>
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
                        <option value="basico">📘 Básico (Peso {pesoBasicas})</option>
                        <option value="especifico">🎯 Específico (Peso {pesoEspecificas})</option>
                      </select>
                    </td>

                    <td className="py-3 px-3 text-center text-gray-400">
                      {m.qtdTopicos}
                    </td>

                    <td className="py-3 px-3 text-center">
                      {modoDistribuicao === 'bloco' ? (
                        <span
                          title="Calculado automaticamente pelo tamanho do edital + incidência"
                          className="px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-500 font-black"
                        >
                          ~{m.qtdQuestoes} q.
                        </span>
                      ) : (
                        <input
                          type="number"
                          min="1"
                          max="120"
                          value={m.qtdQuestoes}
                          onChange={(e) => atualizarParametroMateria(m.indexOriginal, 'qtdQuestoes', Number(e.target.value))}
                          className="w-16 p-1.5 text-center rounded-lg bg-gray-100 dark:bg-gray-900 border dark:border-gray-700 dark:text-white"
                        />
                      )}
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
                          🤖 Auto ({PESOS_DOMINIO[m.dominioKey]?.label.split(' ')[0]})
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

      {/* MODAL: RAIO-X HISTÓRICO DA BANCA (COM GROQ + GEMINI + MOTOR LOCAL SEM CHAVE) */}
      {modalIaAberto && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-2xl p-6 w-full max-w-lg shadow-2xl space-y-4 animate-fade-in">
            <div className="flex justify-between items-center border-b dark:border-gray-700 pb-3">
              <div>
                <span className="text-xs font-black uppercase text-purple-500">
                  Inteligência Estatística de Concursos
                </span>
                <h3 className="text-xl font-black text-gray-800 dark:text-white">
                  Raio-X Histórico da Banca
                </h3>
              </div>
              <button
                onClick={() => setModalIaAberto(false)}
                className="text-gray-400 hover:text-red-500 text-lg"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <form onSubmit={executarRaioXBancaIA} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">
                    Banca Examinadora
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Vunesp, Cebraspe, FGV"
                    value={banca}
                    onChange={(e) => setBanca(e.target.value)}
                    className="w-full p-3 rounded-xl bg-gray-100 dark:bg-gray-900 border dark:border-gray-700 font-bold dark:text-white text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">
                    Cargo e Órgão
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Analista de Sistemas - TRF 3"
                    value={cargoOrgao}
                    onChange={(e) => setCargoOrgao(e.target.value)}
                    className="w-full p-3 rounded-xl bg-gray-100 dark:bg-gray-900 border dark:border-gray-700 font-bold dark:text-white text-sm"
                  />
                </div>
              </div>

              {/* Opção 1: Sem precisar de chave de API */}
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between gap-3">
                <div>
                  <span className="block text-xs font-black text-emerald-500 uppercase">
                    ⚡ Sem Chave de API (Recomendado / Instantâneo)
                  </span>
                  <span className="text-[11px] text-gray-500 dark:text-gray-300">
                    Classifica Básicas vs Específicas, calcula questões pelo tamanho do edital e destaca tópicos prioritários da {banca || 'banca'} localmente.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={executarRaioXLocalSemChave}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs px-4 py-2.5 rounded-xl shrink-0 shadow transition"
                >
                  Calibrar Agora
                </button>
              </div>

              {/* Opção 2: Com IA Externa (Groq ou Gemini) */}
              <div className="pt-2 border-t dark:border-gray-700 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-gray-400 uppercase">
                    Ou usar IA na Nuvem:
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setProvedorIa('groq')}
                      className={`text-xs font-black px-3 py-1 rounded-lg border transition ${
                        provedorIa === 'groq'
                          ? 'bg-indigo-600 border-indigo-500 text-white'
                          : 'bg-gray-100 dark:bg-gray-900 border-gray-700 text-gray-400'
                      }`}
                    >
                      Groq / Llama 3.3 (Grátis e Sem Erro)
                    </button>
                    <button
                      type="button"
                      onClick={() => setProvedorIa('gemini')}
                      className={`text-xs font-black px-3 py-1 rounded-lg border transition ${
                        provedorIa === 'gemini'
                          ? 'bg-indigo-600 border-indigo-500 text-white'
                          : 'bg-gray-100 dark:bg-gray-900 border-gray-700 text-gray-400'
                      }`}
                    >
                      Google Gemini
                    </button>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[11px] font-bold text-gray-400">
                      {provedorIa === 'groq' ? 'Chave da API Groq (gsk_...)' : 'Chave da API Gemini'}
                    </span>
                    {provedorIa === 'groq' ? (
                      <a
                        href="https://console.groq.com/keys"
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-bold text-indigo-400 hover:underline"
                      >
                        Pegar chave grátis em console.groq.com/keys ↗
                      </a>
                    ) : (
                      <a
                        href="https://aistudio.google.com/app/apikey"
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-bold text-indigo-400 hover:underline"
                      >
                        Abrir Google AI Studio ↗
                      </a>
                    )}
                  </div>
                  <input
                    type="password"
                    placeholder={provedorIa === 'groq' ? 'gsk_...' : 'Cole sua chave aqui...'}
                    value={apiKeyInput}
                    onChange={(e) => setApiKeyInput(e.target.value)}
                    className="w-full p-3 rounded-xl bg-gray-100 dark:bg-gray-900 border dark:border-gray-700 font-mono text-xs dark:text-white"
                  />
                </div>
              </div>

              {erroIa && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold">
                  {erroIa}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalIaAberto(false)}
                  className="px-4 py-2.5 rounded-xl font-bold text-gray-500"
                >
                  Fechar
                </button>
                <button
                  type="submit"
                  disabled={analisandoIa}
                  className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-black px-5 py-2.5 rounded-xl shadow-lg transition disabled:opacity-50 flex items-center gap-2 text-xs"
                >
                  {analisandoIa ? (
                    <>
                      <i className="fa-solid fa-spinner fa-spin"></i>
                      Analisando via IA...
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-bolt"></i>
                      Analisar com Chave de API
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}