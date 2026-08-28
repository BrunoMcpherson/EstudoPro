// script.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDYnsuC9yCjj8eXnOOMiWYW1wGxaowr57s",
  authDomain: "estudopro-69257.firebaseapp.com",
  projectId: "estudopro-69257",
  storageBucket: "estudopro-69257.firebasestorage.app",
  messagingSenderId: "801086314261",
  appId: "1:801086314261:web:0e5559f9b530dde8cd7b1c"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
let usuarioAtual = null;

let dadosEstudo = {
    materias: [], revisoes: [], tempoTotal: 0, pomodorosRealizados: 0, paginasLidas: 0,
    ofensiva: { dias: 0, ultimaData: null }, questoesGerais: { acertos: 0, erros: 0 },
    historicoDias: {}, intervalosRevisao: [1, 7, 30], pdfs: [], concursos: [], concursoAtivo: null,
    perfil: { nome: "", idade: "", telefone: "", email: "" },
    configRevisaoAuto: true,
    darkMode: false // Variável do Modo Noturno
};

let chartGeral = null, chartMaterias = null, chartEvolucao = null, chartTempoMat = null;

function exibirMensagemErro(msg) { const el = document.getElementById('auth-mensagem'); el.innerText = msg; el.classList.remove('hidden', 'text-green-500'); el.classList.add('text-red-500', 'block'); }
function alternarAuth(tela) { const login = document.getElementById('form-login'); const cadastro = document.getElementById('form-cadastro'); const sub = document.getElementById('auth-subtitle'); document.getElementById('auth-mensagem').classList.add('hidden'); if(tela === 'cadastro') { login.classList.add('hidden'); cadastro.classList.remove('hidden'); sub.innerText = "Crie sua conta para salvar na nuvem"; } else { cadastro.classList.add('hidden'); login.classList.remove('hidden'); sub.innerText = "Acesse sua conta"; } }
async function fazerLogin() { const email = document.getElementById('login-email').value; const senha = document.getElementById('login-senha').value; if(!email || !senha) return exibirMensagemErro("Preencha todos os campos."); try { await signInWithEmailAndPassword(auth, email, senha); } catch (error) { exibirMensagemErro("Email ou senha incorretos."); } }
async function criarConta() { const nome = document.getElementById('cad-nome').value; const idade = document.getElementById('cad-idade').value; const telefone = document.getElementById('cad-telefone').value; const email = document.getElementById('cad-email').value; const senha = document.getElementById('cad-senha').value; if(!nome || !idade || !telefone || !email || !senha) return exibirMensagemErro("Preencha todos os campos."); if(senha.length < 6) return exibirMensagemErro("A senha deve ter no mínimo 6 caracteres."); try { const userCredential = await createUserWithEmailAndPassword(auth, email, senha); dadosEstudo.perfil = { nome, idade, telefone, email }; await setDoc(doc(db, "usuarios", userCredential.user.uid), dadosEstudo); } catch (error) { exibirMensagemErro("Erro ao criar conta. Email já existe ou formato inválido."); } }
async function sairConta() { await signOut(auth); }

function validarEstruturaDados() {
    dadosEstudo.concursos = dadosEstudo.concursos || []; dadosEstudo.materias = dadosEstudo.materias || []; dadosEstudo.revisoes = dadosEstudo.revisoes || []; dadosEstudo.pdfs = dadosEstudo.pdfs || [];
    dadosEstudo.historicoDias = dadosEstudo.historicoDias || {}; dadosEstudo.intervalosRevisao = dadosEstudo.intervalosRevisao || [1, 7, 30];
    dadosEstudo.ofensiva = dadosEstudo.ofensiva || { dias: 0, ultimaData: null }; dadosEstudo.questoesGerais = dadosEstudo.questoesGerais || { acertos: 0, erros: 0 };
    if(dadosEstudo.configRevisaoAuto === undefined) dadosEstudo.configRevisaoAuto = true;
    if(dadosEstudo.darkMode === undefined) dadosEstudo.darkMode = false;
    if(dadosEstudo.concurso && dadosEstudo.concurso.nome) { const idNovo = Date.now(); dadosEstudo.concursos.push({ id: idNovo, nome: dadosEstudo.concurso.nome, data: dadosEstudo.concurso.data }); dadosEstudo.concursoAtivo = idNovo; delete dadosEstudo.concurso; salvarLocal(false); }
}

onAuthStateChanged(auth, async (user) => {
    if (user) {
        usuarioAtual = user; document.getElementById('tela-login').classList.add('hidden'); document.getElementById('tela-loading').classList.remove('hidden');
        try { const docRef = doc(db, "usuarios", usuarioAtual.uid); const docSnap = await getDoc(docRef); if (docSnap.exists()) { dadosEstudo = { ...dadosEstudo, ...docSnap.data() }; validarEstruturaDados(); } else { await setDoc(docRef, dadosEstudo); } } catch(e) { console.error(e); }
        document.getElementById('tela-loading').classList.add('hidden'); document.getElementById('app-principal').classList.remove('hidden'); document.getElementById('app-principal').classList.add('block'); 
        aplicarDarkMode(); checarOfensivaOnLoad(); aplicarConfigPomo(); atualizarDisplayCrono(); atualizarInterface(); atualizarGraficos();
    } else {
        usuarioAtual = null; document.getElementById('tela-login').classList.remove('hidden'); document.getElementById('app-principal').classList.add('hidden'); document.getElementById('app-principal').classList.remove('block');
    }
});

function salvarLocal(recarregarGraficos = true) {
    renderizarTopBar(); renderizarEdital(); renderizarRevisoes();
    if(recarregarGraficos) { renderizarTabelasEListas(); atualizarGraficos(); }
    if(usuarioAtual) { setDoc(doc(db, "usuarios", usuarioAtual.uid), dadosEstudo).catch(e => console.error(e)); }
}

// MODO NOTURNO
function toggleDarkMode() {
    dadosEstudo.darkMode = !dadosEstudo.darkMode;
    aplicarDarkMode();
    salvarLocal(true); // Recarrega para atualizar os gráficos
}
function aplicarDarkMode() {
    if(dadosEstudo.darkMode) { document.documentElement.classList.add('dark'); } 
    else { document.documentElement.classList.remove('dark'); }
}

function mostrarFormConcurso() { document.getElementById('form-novo-concurso').classList.remove('hidden'); document.getElementById('form-novo-concurso').classList.add('flex'); }
function esconderFormConcurso() { document.getElementById('form-novo-concurso').classList.add('hidden'); document.getElementById('form-novo-concurso').classList.remove('flex'); }
function adicionarConcurso() { const nome = document.getElementById('novo-concurso-nome').value.trim(); const data = document.getElementById('novo-concurso-data').value; if(!nome) return alert('Preencha o Nome do Concurso.'); const id = Date.now(); dadosEstudo.concursos.push({ id: id, nome: nome, data: data || "" }); dadosEstudo.concursoAtivo = id; document.getElementById('novo-concurso-nome').value = ''; document.getElementById('novo-concurso-data').value = ''; esconderFormConcurso(); salvarLocal(true); }
function mudarConcursoAtivo() { const val = document.getElementById('select-concurso').value; dadosEstudo.concursoAtivo = val ? parseInt(val) : null; salvarLocal(false); }
function deletarConcursoAtivo() { if(!dadosEstudo.concursoAtivo) return alert("Nenhum concurso selecionado."); if(confirm("Deseja apagar este concurso da lista?")) { dadosEstudo.concursos = dadosEstudo.concursos.filter(c => c.id !== dadosEstudo.concursoAtivo); dadosEstudo.concursoAtivo = dadosEstudo.concursos.length > 0 ? dadosEstudo.concursos[0].id : null; salvarLocal(true); } }
function calcularDiasRestantes(dataStr) { if(!dataStr) return "--"; const partes = dataStr.split('-'); if(partes.length !== 3) return "--"; const dp = new Date(partes[0], partes[1] - 1, partes[2]); dp.setHours(23, 59, 59); const diff = dp - new Date(); return diff < 0 ? "0" : Math.ceil(diff / (1000 * 60 * 60 * 24)); }

function parseDateLocal(dateStr) { const [y, m, d] = dateStr.split('-'); return new Date(y, m - 1, d); }
function tocarAlarme() { try { const ctx = new (window.AudioContext || window.webkitAudioContext)(); for (let i = 0; i < 3; i++) { const osc = ctx.createOscillator(); const gain = ctx.createGain(); osc.connect(gain); gain.connect(ctx.destination); osc.type = 'sine'; osc.frequency.setValueAtTime(800, ctx.currentTime + (i * 0.4)); gain.gain.setValueAtTime(1, ctx.currentTime + (i * 0.4)); osc.start(ctx.currentTime + (i * 0.4)); osc.stop(ctx.currentTime + (i * 0.4) + 0.2); } } catch(e) {} }

function checarOfensivaOnLoad() { const hL = new Date(); const hjStr = hL.getFullYear() + '-' + String(hL.getMonth()+1).padStart(2,'0') + '-' + String(hL.getDate()).padStart(2,'0'); const ult = dadosEstudo.ofensiva.ultimaData; if (ult && ult !== hjStr) { const diffDays = Math.ceil(Math.abs(parseDateLocal(hjStr) - parseDateLocal(ult)) / (1000 * 60 * 60 * 24)); if (diffDays > 1) { dadosEstudo.ofensiva.dias = 0; salvarLocal(false); } } }
function registrarAtividade(minAdd=0, acAdd=0, erAdd=0, pagAdd=0, iMat="") {
    const hL = new Date(); const hjStr = hL.getFullYear() + '-' + String(hL.getMonth()+1).padStart(2,'0') + '-' + String(hL.getDate()).padStart(2,'0');
    if(!dadosEstudo.historicoDias[hjStr]) dadosEstudo.historicoDias[hjStr] = { minutos: 0, acertos: 0, erros: 0, paginas: 0 };
    let h = dadosEstudo.historicoDias[hjStr]; h.minutos = (h.minutos || 0) + minAdd; h.acertos = (h.acertos || 0) + acAdd; h.erros = (h.erros || 0) + erAdd; h.paginas = (h.paginas || 0) + pagAdd;
    if(minAdd > 0 && iMat !== "") { if(!dadosEstudo.materias[iMat].tempo) dadosEstudo.materias[iMat].tempo = 0; dadosEstudo.materias[iMat].tempo += minAdd; }
    const ult = dadosEstudo.ofensiva.ultimaData;
    if (ult !== hjStr) { if (ult) { const diff = Math.ceil(Math.abs(parseDateLocal(hjStr) - parseDateLocal(ult)) / (1000 * 60 * 60 * 24)); if (diff === 1) dadosEstudo.ofensiva.dias++; else dadosEstudo.ofensiva.dias = 1; } else dadosEstudo.ofensiva.dias = 1; dadosEstudo.ofensiva.ultimaData = hjStr; }
}

function mudarAbaTempo(aba) { 
    document.getElementById('tab-btn-pomo').classList.remove('tab-active', 'text-gray-400'); document.getElementById('tab-btn-crono').classList.remove('tab-active', 'text-gray-400'); document.getElementById('tab-btn-manual').classList.remove('tab-active', 'text-gray-400');
    document.getElementById('aba-pomodoro').classList.add('hidden'); document.getElementById('aba-cronometro').classList.add('hidden'); document.getElementById('aba-manual').classList.add('hidden');
    if(aba === 'pomo') { document.getElementById('tab-btn-pomo').classList.add('tab-active'); document.getElementById('tab-btn-crono').classList.add('text-gray-400'); document.getElementById('tab-btn-manual').classList.add('text-gray-400'); document.getElementById('aba-pomodoro').classList.remove('hidden'); } else if (aba === 'crono') { document.getElementById('tab-btn-crono').classList.add('tab-active'); document.getElementById('tab-btn-pomo').classList.add('text-gray-400'); document.getElementById('tab-btn-manual').classList.add('text-gray-400'); document.getElementById('aba-cronometro').classList.remove('hidden'); } else { document.getElementById('tab-btn-manual').classList.add('tab-active'); document.getElementById('tab-btn-pomo').classList.add('text-gray-400'); document.getElementById('tab-btn-crono').classList.add('text-gray-400'); document.getElementById('aba-manual').classList.remove('hidden'); }
}

function salvarTempoManual() {
    const horas = parseInt(document.getElementById('manual-horas').value) || 0; const minutos = parseInt(document.getElementById('manual-minutos').value) || 0;
    const matId = document.getElementById('select-materia-tempo').value;
    if (matId === "") return alert("Selecione uma matéria específica antes de registrar o tempo!");
    const tMin = (horas * 60) + minutos; if (tMin <= 0) return alert("Insira um tempo válido.");
    dadosEstudo.tempoTotal += tMin; registrarAtividade(tMin, 0, 0, 0, matId); salvarLocal(true);
    document.getElementById('manual-horas').value = ''; document.getElementById('manual-minutos').value = ''; alert(`Salvo: ${horas}h e ${minutos}m`);
}

let pomoTempoRestante = 25 * 60; let pomoInterval; let pomoRodando = false; let pomoEmFoco = true; let dataAlvoPomo = null;
function aplicarConfigPomo() { if(!pomoRodando) { pomoTempoRestante = (parseInt(document.getElementById('cfg-pomo-foco').value) || 25) * 60; atualizarDisplayPomo(); } }
function atualizarDisplayPomo() { let m = Math.floor(pomoTempoRestante / 60).toString().padStart(2, '0'); let s = (pomoTempoRestante % 60).toString().padStart(2, '0'); document.getElementById('display-pomo').innerText = `${m}:${s}`; }

function iniciarPomodoro(isFoco) {
    if (pomoRodando) return; 
    const matId = document.getElementById('select-materia-tempo').value;
    if (matId === "" && isFoco) return alert("Selecione uma matéria específica para focar!");
    pomoEmFoco = isFoco; const tFoco = (parseInt(document.getElementById('cfg-pomo-foco').value) || 25) * 60; const tPausa = (parseInt(document.getElementById('cfg-pomo-pausa').value) || 5) * 60;
    if(pomoTempoRestante === 0 || (pomoTempoRestante === tFoco) || (pomoTempoRestante === tPausa)) { pomoTempoRestante = isFoco ? tFoco : tPausa; }
    dataAlvoPomo = Date.now() + (pomoTempoRestante * 1000); 
    pomoRodando = true; 
    pomoInterval = setInterval(() => {
        pomoTempoRestante = Math.round((dataAlvoPomo - Date.now()) / 1000);
        if (pomoTempoRestante <= 0) { 
            pomoTempoRestante = 0; pararPomodoro(); tocarAlarme(); 
            if(pomoEmFoco) { const min = parseInt(document.getElementById('cfg-pomo-foco').value) || 25; dadosEstudo.tempoTotal += min; dadosEstudo.pomodorosRealizados++; registrarAtividade(min, 0, 0, 0, matId); salvarLocal(true); setTimeout(() => alert("Foco Finalizado!"), 500); } 
            else setTimeout(() => alert("Descanso Finalizado!"), 500); 
        }
        atualizarDisplayPomo();
    }, 1000);
}
function pausarPomodoroTimer() { clearInterval(pomoInterval); pomoRodando = false; }
function pararPomodoro() { clearInterval(pomoInterval); pomoRodando = false; pomoTempoRestante = (parseInt(document.getElementById('cfg-pomo-foco').value) || 25) * 60; atualizarDisplayPomo(); }

let cronoSegundos = 0; let cronoInterval; let cronoRodando = false; let dataInicioCrono = null;
function atualizarDisplayCrono() { let h = Math.floor(cronoSegundos / 3600).toString().padStart(2, '0'); let m = Math.floor((cronoSegundos % 3600) / 60).toString().padStart(2, '0'); let s = (cronoSegundos % 60).toString().padStart(2, '0'); document.getElementById('display-crono').innerText = `${h}:${m}:${s}`; }
function iniciarCrono() { 
    if(document.getElementById('select-materia-tempo').value === "") return alert("Selecione uma matéria específica para cronometrar!");
    if(!cronoRodando) { cronoRodando = true; dataInicioCrono = Date.now() - (cronoSegundos * 1000); cronoInterval = setInterval(() => { cronoSegundos = Math.floor((Date.now() - dataInicioCrono) / 1000); atualizarDisplayCrono(); }, 1000); } 
}
function pausarCrono() { clearInterval(cronoInterval); cronoRodando = false; }
function pararESalvarCrono() { 
    pausarCrono(); 
    const matId = document.getElementById('select-materia-tempo').value;
    if(matId === "" && cronoSegundos >= 60) return alert("Selecione a matéria antes de Salvar!");
    if(cronoSegundos >= 60) { const min = Math.floor(cronoSegundos / 60); dadosEstudo.tempoTotal += min; registrarAtividade(min, 0, 0, 0, matId); salvarLocal(true); alert(`Salvo: ${min} minutos!`); } 
    cronoSegundos = 0; atualizarDisplayCrono(); 
}

function resetarPaginas() { if(confirm("Zerar as páginas?")) { dadosEstudo.paginasLidas = 0; dadosEstudo.pdfs.forEach(p => { p.lidas = 0; p.ultimaPagina = 0; }); Object.keys(dadosEstudo.historicoDias).forEach(d => { dadosEstudo.historicoDias[d].paginas = 0; }); salvarLocal(true); } }
function resetarQuestoes() { if(confirm("Zerar questões?")) { dadosEstudo.questoesGerais = { acertos: 0, erros: 0 }; dadosEstudo.materias.forEach(m => { if(m.questoes) m.questoes = { acertos: 0, erros: 0 }; }); Object.keys(dadosEstudo.historicoDias).forEach(d => { dadosEstudo.historicoDias[d].acertos = 0; dadosEstudo.historicoDias[d].erros = 0; }); salvarLocal(true); } }
function resetarTempo() { if(confirm("Zerar histórico de tempo?")) { dadosEstudo.tempoTotal = 0; dadosEstudo.materias.forEach(m => m.tempo = 0); Object.keys(dadosEstudo.historicoDias).forEach(d => { dadosEstudo.historicoDias[d].minutos = 0; }); salvarLocal(true); } }
function resetarPomodoros() { if(confirm("Zerar pomodoros?")) { dadosEstudo.pomodorosRealizados = 0; salvarLocal(true); } }
function resetarCalendario() { if(confirm("Limpar visual do calendário?")) { dadosEstudo.historicoDias = {}; salvarLocal(true); } }

function adicionarMateriaEmMassa() { const nome = document.getElementById('nova-materia').value.trim(); const texto = document.getElementById('texto-edital').value; if (!nome) return alert("Digite o nome da matéria!"); const linhas = texto.split(/\n|,|\.\s/).map(l => l.trim()).filter(l => l !== ""); const subtemas = linhas.map(l => ({ nome: l, concluido: false })); dadosEstudo.materias.push({ nome, subtemas, questoes: { acertos: 0, erros: 0 }, tempo: 0, expandido: true }); document.getElementById('nova-materia').value = ""; document.getElementById('texto-edital').value = ""; salvarLocal(true); }
function adicionarSubtema(i) { const inp = document.getElementById(`novo-subtema-${i}`); if (inp.value.trim()) { dadosEstudo.materias[i].subtemas.push({ nome: inp.value.trim(), concluido: false }); inp.value = ""; salvarLocal(false); } }

function toggleRevisaoAuto() { dadosEstudo.configRevisaoAuto = document.getElementById('check-rev-auto').checked; salvarLocal(false); }
function alternarConclusao(iMat, iSub) { const sub = dadosEstudo.materias[iMat].subtemas[iSub]; sub.concluido = !sub.concluido; if (sub.concluido) { if(dadosEstudo.configRevisaoAuto) { agendarRevisoes(dadosEstudo.materias[iMat].nome, sub.nome); } registrarAtividade(0,0,0,0); } salvarLocal(false); }
function deletarMateria(i) { if (confirm("Excluir matéria e todo seu histórico?")) { let mat = dadosEstudo.materias[i]; if(mat.questoes) { dadosEstudo.questoesGerais.acertos = Math.max(0, dadosEstudo.questoesGerais.acertos - mat.questoes.acertos); dadosEstudo.questoesGerais.erros = Math.max(0, dadosEstudo.questoesGerais.erros - mat.questoes.erros); } if(mat.tempo) dadosEstudo.tempoTotal = Math.max(0, dadosEstudo.tempoTotal - mat.tempo); dadosEstudo.materias.splice(i, 1); salvarLocal(true); } }
function deletarSubtema(iMat, iSub) { if (confirm("Excluir este tópico específico?")) { dadosEstudo.materias[iMat].subtemas.splice(iSub, 1); salvarLocal(false); } }
function alternarExpandirMateria(iMat) { if(dadosEstudo.materias[iMat].expandido === undefined) dadosEstudo.materias[iMat].expandido = true; dadosEstudo.materias[iMat].expandido = !dadosEstudo.materias[iMat].expandido; salvarLocal(false); }

function adicionarPdf() { let nome = document.getElementById('pdf-nome').value.trim(); let link = document.getElementById('pdf-link').value.trim(); let total = parseInt(document.getElementById('pdf-total').value); if(nome && total > 0) { dadosEstudo.pdfs.push({ id: Date.now(), nome, link, totalPaginas: total, lidas: 0, ultimaPagina: 0 }); document.getElementById('pdf-nome').value = ""; document.getElementById('pdf-link').value = ""; document.getElementById('pdf-total').value = ""; salvarLocal(true); } else alert("Preencha corretamente."); }
function atualizarLeituraPdf(id) { let ini = parseInt(document.getElementById(`pdf-ini-${id}`).value); let fim = parseInt(document.getElementById(`pdf-fim-${id}`).value); if (!isNaN(ini) && !isNaN(fim) && fim >= ini) { let qtd = (fim - ini) + 1; let pdf = dadosEstudo.pdfs.find(p => p.id === id); if(pdf) { pdf.lidas += qtd; if(pdf.lidas > pdf.totalPaginas) pdf.lidas = pdf.totalPaginas; pdf.ultimaPagina = fim; dadosEstudo.paginasLidas += qtd; registrarAtividade(0, 0, 0, qtd); salvarLocal(true); } } else alert("Intervalo inválido."); }
function deletarPdf(id) { if(confirm("Excluir PDF?")) { dadosEstudo.pdfs = dadosEstudo.pdfs.filter(p => p.id !== id); salvarLocal(true); } }

function salvarQuestoes() { const i = document.getElementById('select-materia-questoes').value; const ac = parseInt(document.getElementById('input-acertos').value) || 0; const er = parseInt(document.getElementById('input-erros').value) || 0; if (i === "" || (ac === 0 && er === 0)) return alert("Selecione matéria e valores."); dadosEstudo.questoesGerais.acertos += ac; dadosEstudo.questoesGerais.erros += er; if(!dadosEstudo.materias[i].questoes) dadosEstudo.materias[i].questoes = { acertos: 0, erros: 0 }; dadosEstudo.materias[i].questoes.acertos += ac; dadosEstudo.materias[i].questoes.erros += er; document.getElementById('input-acertos').value = ""; document.getElementById('input-erros').value = ""; registrarAtividade(0, ac, er, 0); salvarLocal(true); }
function salvarConfigRevisoes() { const nums = document.getElementById('config-revisoes-input').value.split(',').map(n => parseInt(n.trim())).filter(n => !isNaN(n)); if(nums.length > 0) { dadosEstudo.intervalosRevisao = nums; salvarLocal(false); } else { document.getElementById('config-revisoes-input').value = dadosEstudo.intervalosRevisao.join(', '); } }
function agendarRevisoes(mat, sub) { const hoje = new Date(); dadosEstudo.intervalosRevisao.forEach(d => { let data = new Date(hoje); data.setDate(hoje.getDate() + d); dadosEstudo.revisoes.push({ id: Date.now() + Math.random(), materia: mat, subtema: sub, dataAgendada: data.toISOString().split('T')[0], tipo: `${d}d` }); }); dadosEstudo.revisoes.sort((a, b) => new Date(a.dataAgendada) - new Date(b.dataAgendada)); }
function concluirRevisao(id) { dadosEstudo.revisoes = dadosEstudo.revisoes.filter(r => r.id !== id); registrarAtividade(0,0,0,0); salvarLocal(false); }
function excluirRevisao(id) { if(confirm("Apagar revisão?")) { dadosEstudo.revisoes = dadosEstudo.revisoes.filter(r => r.id !== id); salvarLocal(false); } }

function renderizarTopBar() {
    const selectConc = document.getElementById('select-concurso'); const dataDisp = document.getElementById('display-concurso-data'); const diasDisp = document.getElementById('dias-restantes');
    selectConc.innerHTML = '<option value="" class="text-gray-800 dark:text-white">Selecione uma prova...</option>';
    if(dadosEstudo.concursos) { dadosEstudo.concursos.forEach(c => { selectConc.innerHTML += `<option value="${c.id}" class="text-gray-800 dark:text-white">${c.nome}</option>`; }); }
    if(dadosEstudo.concursoAtivo) { selectConc.value = dadosEstudo.concursoAtivo; const conc = dadosEstudo.concursos.find(c => c.id === dadosEstudo.concursoAtivo); if(conc) { if(conc.data) { const dp = conc.data.split('-'); dataDisp.innerText = `${dp[2]}/${dp[1]}/${dp[0]}`; diasDisp.innerText = calcularDiasRestantes(conc.data); } else { dataDisp.innerText = 'Sem data'; diasDisp.innerText = '--'; } } } else { dataDisp.innerText = '--/--/----'; diasDisp.innerText = '--'; }
    document.getElementById('config-revisoes-input').value = dadosEstudo.intervalosRevisao.join(', '); 
    document.getElementById('check-rev-auto').checked = dadosEstudo.configRevisaoAuto;
    document.getElementById('display-ofensiva').innerText = dadosEstudo.ofensiva.dias; document.getElementById('display-pomodoros').innerText = dadosEstudo.pomodorosRealizados; document.getElementById('display-paginas').innerText = dadosEstudo.paginasLidas; document.getElementById('display-questoes-totais').innerText = dadosEstudo.questoesGerais.acertos + dadosEstudo.questoesGerais.erros; const h = Math.floor(dadosEstudo.tempoTotal / 60); const m = dadosEstudo.tempoTotal % 60; document.getElementById('display-tempo').innerText = `${h}h ${m}m`;
    const cal = document.getElementById('calendario-grid'); cal.innerHTML = ''; const hj = new Date(); document.getElementById('mes-atual-label').innerText = hj.toLocaleString('pt-BR', { month: 'long', year: 'numeric' }).toUpperCase();
    const a = hj.getFullYear(); const mes = hj.getMonth(); const pD = new Date(a, mes, 1).getDay(); const dM = new Date(a, mes + 1, 0).getDate(); const hjStr = a + '-' + String(mes+1).padStart(2,'0') + '-' + String(hj.getDate()).padStart(2,'0');
    for(let i=0; i<pD; i++) cal.innerHTML += `<div></div>`;
    for(let d=1; d<=dM; d++) { const dataStr = `${a}-${String(mes+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`; const est = dadosEstudo.historicoDias[dataStr]; let cls = 'bg-gray-100 dark:bg-gray-700 rounded text-gray-400 dark:text-gray-500'; let title = `${d}/${mes+1} - Sem estudos`; if (est && (est.minutos > 0 || est.acertos > 0 || est.paginas > 0)) { cls = 'bg-green-500 text-white rounded font-bold shadow-sm'; title = `${d}/${mes+1}: ${est.minutos}min | ${est.acertos+est.erros}q | ${est.paginas}pág`; } else if (dataStr === hjStr) { cls = 'bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200 rounded font-bold border border-indigo-300 dark:border-indigo-700'; title = `Hoje!`; } cal.innerHTML += `<div class="p-2 cursor-help transition hover:opacity-80 ${cls}" title="${title}">${d}</div>`; }
}

function renderizarEdital() {
    const listaEd = document.getElementById('lista-edital'); listaEd.innerHTML = dadosEstudo.materias.length === 0 ? "<p class='text-gray-400 text-sm'>Vazio.</p>" : "";
    dadosEstudo.materias.forEach((mat, iMat) => {
        const isExp = mat.expandido === undefined ? true : mat.expandido; const iconDir = isExp ? 'fa-chevron-up' : 'fa-chevron-down'; const displaySub = isExp ? 'block' : 'hidden';
        const ht = Math.floor((mat.tempo || 0) / 60); const mt = (mat.tempo || 0) % 60; let tFormat = mat.tempo ? (ht > 0 ? ht+'h ' : '') + mt+'m' : '0m';
        const concl = mat.subtemas.filter(s => s.concluido).length; const pctEd = mat.subtemas.length === 0 ? 0 : Math.round((concl / mat.subtemas.length) * 100);
        let subs = mat.subtemas.map((s, iSub) => `<div class="flex justify-between items-center mt-2 ml-4 p-1 hover:bg-gray-50 dark:hover:bg-gray-700 rounded group"><div class="flex items-center gap-2 flex-1"><input type="checkbox" ${s.concluido ? 'checked' : ''} onchange="alternarConclusao(${iMat}, ${iSub})" class="w-4 h-4 text-indigo-600 cursor-pointer"><span class="${s.concluido ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-700 dark:text-gray-200'} text-sm">${s.nome}</span></div><button onclick="deletarSubtema(${iMat}, ${iSub})" class="text-gray-300 dark:text-gray-600 hover:text-red-500 hidden group-hover:block transition" title="Apagar Tópico"><i class="fa-solid fa-trash text-xs"></i></button></div>`).join('');
        listaEd.innerHTML += `<div class="border dark:border-gray-700 rounded-xl p-4 bg-white dark:bg-gray-800 mb-4 shadow-sm border-l-4 border-l-indigo-400 transicao-suave"><div class="flex justify-between items-center mb-2"><div class="flex-1 cursor-pointer flex items-center gap-2" onclick="alternarExpandirMateria(${iMat})"><i class="fa-solid ${iconDir} text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 w-4"></i><h3 class="font-bold text-gray-800 dark:text-white">${mat.nome} <span class="text-xs font-normal text-indigo-500 dark:text-indigo-300 ml-2 bg-indigo-50 dark:bg-indigo-900/50 px-2 py-1 rounded"><i class="fa-solid fa-clock"></i> ${tFormat}</span></h3> </div><button onclick="deletarMateria(${iMat})" class="text-gray-400 hover:text-red-500" title="Apagar Matéria"><i class="fa-solid fa-trash"></i></button></div><div class="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2 mb-3"><div class="bg-indigo-500 h-2 rounded-full" style="width: ${pctEd}%"></div></div><div class="${displaySub} transicao-suave"><div class="flex gap-2 mb-2 ml-4"><input type="text" id="novo-subtema-${iMat}" placeholder="Adicionar tópico..." class="text-sm p-1 bg-gray-50 dark:bg-gray-700 dark:text-white border dark:border-gray-600 rounded flex-1"><button onclick="adicionarSubtema(${iMat})" class="bg-gray-200 dark:bg-gray-600 dark:text-white px-2 rounded hover:bg-gray-300 dark:hover:bg-gray-500 text-sm font-bold">Add</button></div><div class="max-h-64 overflow-y-auto scroll-custom">${subs}</div></div></div>`;
    });
}
function renderizarRevisoes() { const lr = document.getElementById('lista-revisoes'); lr.innerHTML = dadosEstudo.revisoes.length === 0 ? "<p class='text-gray-500 dark:text-gray-400 text-sm'>Tudo em dia!</p>" : ""; dadosEstudo.revisoes.forEach(r => { const [a, m, d] = r.dataAgendada.split('-'); lr.innerHTML += `<div class="bg-white dark:bg-gray-700 p-3 rounded-lg border-l-4 border-orange-400 shadow-sm flex justify-between items-center mb-2"><div><p class="text-xs text-orange-600 dark:text-orange-400 font-bold uppercase">${r.tipo} - ${d}/${m}/${a}</p><p class="font-bold text-gray-800 dark:text-white text-sm">${r.materia}</p> <p class="text-gray-500 dark:text-gray-300 text-xs truncate w-32 md:w-48">${r.subtema}</p></div><div class="flex gap-1"><button onclick="concluirRevisao(${r.id})" class="text-green-500 hover:text-green-700 dark:hover:text-green-400 p-2"><i class="fa-solid fa-check-circle text-xl"></i></button><button onclick="excluirRevisao(${r.id})" class="text-gray-400 hover:text-red-500 p-2"><i class="fa-solid fa-trash"></i></button></div></div>`; }); }
function renderizarTabelasEListas() {
    const listaPdfs = document.getElementById('lista-pdfs'); listaPdfs.innerHTML = dadosEstudo.pdfs.length === 0 ? "<p class='text-gray-400 text-sm'>Nenhum material.</p>" : ""; dadosEstudo.pdfs.forEach(p => { let pct = p.totalPaginas > 0 ? Math.round((p.lidas / p.totalPaginas) * 100) : 0; let lHtml = p.link ? `<a href="${p.link}" target="_blank" class="text-blue-500 hover:underline text-xs">Abrir PDF</a>` : ``; listaPdfs.innerHTML += `<div class="border dark:border-gray-700 rounded p-3 bg-white dark:bg-gray-700 shadow-sm border-l-4 border-red-400"><div class="flex justify-between items-start mb-2"><div><p class="font-bold text-gray-800 dark:text-white text-sm">${p.nome}</p>${lHtml}</div><button onclick="deletarPdf(${p.id})" class="text-gray-300 dark:text-gray-500 hover:text-red-500"><i class="fa-solid fa-trash"></i></button></div><div class="flex justify-between text-xs text-gray-500 dark:text-gray-300 mb-1 font-bold"><span>Lidas: ${p.lidas}/${p.totalPaginas}</span> <span>Pág. ${p.ultimaPagina}</span></div><div class="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-1.5 mb-3"><div class="bg-red-500 h-1.5 rounded-full" style="width: ${pct}%"></div></div><div class="flex items-center gap-1 text-xs"><input type="number" id="pdf-ini-${p.id}" placeholder="Início" class="border dark:border-gray-600 dark:bg-gray-800 dark:text-white p-1 w-12 rounded text-center"><span class="dark:text-gray-300">a</span><input type="number" id="pdf-fim-${p.id}" placeholder="Fim" class="border dark:border-gray-600 dark:bg-gray-800 dark:text-white p-1 w-12 rounded text-center"><button onclick="atualizarLeituraPdf(${p.id})" class="bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-400 px-2 py-1 rounded font-bold hover:bg-green-200 dark:hover:bg-green-900 flex-1">+ Reg.</button></div></div>`; });
    const selMatQ = document.getElementById('select-materia-questoes'); selMatQ.innerHTML = '<option value="">Selecione...</option>'; const selMatT = document.getElementById('select-materia-tempo'); selMatT.innerHTML = '<option value="" disabled selected>Selecione a matéria...</option>'; const tabQ = document.getElementById('tabela-questoes'); tabQ.innerHTML = "";
    dadosEstudo.materias.forEach((mat, iMat) => { selMatQ.innerHTML += `<option value="${iMat}">${mat.nome}</option>`; selMatT.innerHTML += `<option value="${iMat}">${mat.nome}</option>`; if(mat.questoes) { const tM = mat.questoes.acertos + mat.questoes.erros; const pctM = tM === 0 ? 0 : Math.round((mat.questoes.acertos / tM)*100); tabQ.innerHTML += `<tr class="border-b dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700/50"><td class="py-2 font-bold text-gray-700 dark:text-gray-200">${mat.nome}</td> <td class="py-2 text-center text-gray-500 dark:text-gray-400">${tM}</td><td class="py-2 text-center font-bold text-green-600 dark:text-green-400">${mat.questoes.acertos}</td> <td class="py-2 text-center font-bold text-red-500 dark:text-red-400">${mat.questoes.erros}</td><td class="py-2 text-right font-black ${pctM >= 80 ? 'text-green-600 dark:text-green-400' : (pctM>=60 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-500 dark:text-red-400')}">${pctM}%</td> </tr>`; } });
}

function atualizarGraficos() {
    // Define a cor base dos textos dos gráficos baseado no Modo Noturno
    const textColor = dadosEstudo.darkMode ? '#9ca3af' : '#6b7280';
    Chart.defaults.color = textColor;

    let totQ = dadosEstudo.questoesGerais.acertos + dadosEstudo.questoesGerais.erros; 
    if(chartGeral) chartGeral.destroy(); 
    chartGeral = new Chart(document.getElementById('graficoGeral').getContext('2d'), { 
        type: 'doughnut', 
        data: { labels: totQ>0?['Acertos', 'Erros']:['Sem Dados'], datasets: [{ data: totQ>0?[dadosEstudo.questoesGerais.acertos, dadosEstudo.questoesGerais.erros]:[1], backgroundColor: totQ>0?['#10b981', '#ef4444']:['#e5e7eb'], borderWidth: 0 }] }, 
        options: { 
            responsive: true, maintainAspectRatio: false, cutout: '70%', 
            plugins: { 
                legend: { display: false }, 
                // TÍTULO ADICIONADO AQUI
                title: { display: true, text: 'Geral (Acertos x Erros)', color: textColor, font: { size: 14 } },
                tooltip: { enabled: totQ>0, callbacks: { label: function(context) { return ' ' + context.label + ': ' + context.parsed + ' questões'; } } } 
            } 
        } 
    });

    const labelsM = [], dadosM = [], coresM = [], labelsT = [], dadosT = [];
    dadosEstudo.materias.forEach(m => { 
        const nomeGrafico = m.nome.length > 20 ? m.nome.substring(0, 20) + '...' : m.nome;
        if(m.questoes && (m.questoes.acertos > 0 || m.questoes.erros > 0)) { labelsM.push(nomeGrafico); const pct = Math.round((m.questoes.acertos / (m.questoes.acertos + m.questoes.erros)) * 100); dadosM.push(pct); coresM.push(pct >= 80 ? '#10b981' : (pct >= 60 ? '#f59e0b' : '#ef4444')); } 
        if(m.tempo && m.tempo > 0) { labelsT.push(nomeGrafico); dadosT.push((m.tempo / 60).toFixed(1)); } 
    });

    if(chartMaterias) chartMaterias.destroy(); 
    chartMaterias = new Chart(document.getElementById('graficoMaterias').getContext('2d'), { 
        type: 'bar', 
        data: { labels: labelsM.length > 0 ? labelsM : ['-'], datasets: [{ data: dadosM.length > 0 ? dadosM : [0], backgroundColor: coresM.length > 0 ? coresM : ['#374151'], borderRadius: 4 }] }, 
        options: { 
            responsive: true, maintainAspectRatio: false, scales: { y: { max: 100, grid: { color: dadosEstudo.darkMode ? '#374151' : '#e5e7eb' } }, x: { grid: { color: dadosEstudo.darkMode ? '#374151' : '#e5e7eb' } } }, 
            plugins: { 
                legend: { display: false }, 
                // TÍTULO ADICIONADO AQUI
                title: { display: true, text: 'Aproveitamento por Matéria (%)', color: textColor, font: { size: 14 } },
                tooltip: { callbacks: { label: function(context) { return ' Aproveitamento: ' + context.parsed.y + '%'; } } } 
            } 
        } 
    });

    if(chartTempoMat) chartTempoMat.destroy(); 
    chartTempoMat = new Chart(document.getElementById('graficoTempoMateria').getContext('2d'), { 
        type: 'bar', 
        data: { labels: labelsT.length > 0 ? labelsT : ['-'], datasets: [{ label: 'Horas', data: dadosT.length > 0 ? dadosT : [0], backgroundColor: '#4f46e5', borderRadius: 4 }] }, 
        options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, grid: { color: dadosEstudo.darkMode ? '#374151' : '#e5e7eb' } }, x: { grid: { color: dadosEstudo.darkMode ? '#374151' : '#e5e7eb' } } }, plugins: { legend: { display: false }, tooltip: { callbacks: { label: function(context) { return ' Tempo: ' + context.parsed.y + ' hora(s)'; } } } } } 
    });
    
    const evoLabels = []; const evoMin = []; const evoQtd = [];
    for(let i=6; i>=0; i--) { let d = new Date(); d.setDate(d.getDate() - i); let dStr = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0'); evoLabels.push(`${d.getDate()}/${d.getMonth()+1}`); let h = dadosEstudo.historicoDias[dStr] || { minutos:0, acertos:0, erros:0 }; evoMin.push(h.minutos); evoQtd.push(h.acertos + h.erros); }
    if(chartEvolucao) chartEvolucao.destroy(); chartEvolucao = new Chart(document.getElementById('graficoEvolucao').getContext('2d'), { 
        type: 'line', 
        data: { labels: evoLabels, datasets: [ { label: 'Minutos Estudados', data: evoMin, borderColor: '#4f46e5', backgroundColor: 'rgba(79, 70, 229, 0.1)', fill: true, tension: 0.3 }, { label: 'Questões', data: evoQtd, borderColor: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.1)', fill: true, tension: 0.3 } ] }, 
        options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, grid: { color: dadosEstudo.darkMode ? '#374151' : '#e5e7eb' } }, x: { grid: { color: dadosEstudo.darkMode ? '#374151' : '#e5e7eb' } } }, plugins: { legend: { position: 'top', labels: { color: textColor } } } } 
    });
}
function atualizarInterface() { renderizarTopBar(); renderizarTabelasEListas(); renderizarEdital(); renderizarRevisoes(); }

window.alternarAuth = alternarAuth; window.fazerLogin = fazerLogin; window.criarConta = criarConta; window.sairConta = sairConta; window.aplicarConfigPomo = aplicarConfigPomo; window.iniciarPomodoro = iniciarPomodoro; window.pausarPomodoroTimer = pausarPomodoroTimer; window.pararPomodoro = pararPomodoro; window.iniciarCrono = iniciarCrono; window.pausarCrono = pausarCrono; window.pararESalvarCrono = pararESalvarCrono; window.mudarAbaTempo = mudarAbaTempo; window.salvarTempoManual = salvarTempoManual; window.resetarPaginas = resetarPaginas; window.resetarQuestoes = resetarQuestoes; window.resetarTempo = resetarTempo; window.resetarPomodoros = resetarPomodoros; window.resetarCalendario = resetarCalendario; window.adicionarMateriaEmMassa = adicionarMateriaEmMassa; window.adicionarSubtema = adicionarSubtema; window.alternarConclusao = alternarConclusao; window.deletarMateria = deletarMateria; window.deletarSubtema = deletarSubtema; window.alternarExpandirMateria = alternarExpandirMateria; window.adicionarPdf = adicionarPdf; window.atualizarLeituraPdf = atualizarLeituraPdf; window.deletarPdf = deletarPdf; window.salvarQuestoes = salvarQuestoes; window.salvarConfigRevisoes = salvarConfigRevisoes; window.concluirRevisao = concluirRevisao; window.excluirRevisao = excluirRevisao; window.mostrarFormConcurso = mostrarFormConcurso; window.esconderFormConcurso = esconderFormConcurso; window.adicionarConcurso = adicionarConcurso; window.mudarConcursoAtivo = mudarConcursoAtivo; window.deletarConcursoAtivo = deletarConcursoAtivo; window.toggleRevisaoAuto = toggleRevisaoAuto; window.toggleDarkMode = toggleDarkMode;