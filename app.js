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
window.usuarioAtual = null;

window.dadosEstudo = {
    materias: [], revisoes: [], tempoTotal: 0, pomodorosRealizados: 0, paginasLidas: 0,
    ofensiva: { dias: 0, ultimaData: null }, questoesGerais: { acertos: 0, erros: 0 },
    historicoDias: {}, intervalosRevisao: [1, 7, 30], pdfs: [], concursos: [], concursoAtivo: null,
    perfil: { nome: "", idade: "", telefone: "", email: "" },
    configRevisaoAuto: true, darkMode: false,
    flashcards: [], resumos: [], layoutFlashcards: 'grid', layoutResumos: 'grid',
    historicoEstudos: []
};

let chartGeral = null, chartMaterias = null, chartEvolucao = null, chartTempoMat = null;

// =====================================
// AUTENTICAÇÃO E INICIALIZAÇÃO
// =====================================
window.exibirMensagemErro = function(msg) { const el = document.getElementById('auth-mensagem'); el.innerText = msg; el.classList.remove('hidden', 'text-green-500'); el.classList.add('text-red-500', 'block'); };
window.alternarAuth = function(tela) { document.getElementById('auth-mensagem').classList.add('hidden'); if(tela === 'cadastro') { document.getElementById('form-login').classList.add('hidden'); document.getElementById('form-cadastro').classList.remove('hidden'); document.getElementById('auth-subtitle').innerText = "Crie sua conta para salvar na nuvem"; } else { document.getElementById('form-cadastro').classList.add('hidden'); document.getElementById('form-login').classList.remove('hidden'); document.getElementById('auth-subtitle').innerText = "Acesse sua conta"; } };
window.fazerLogin = async function() { const email = document.getElementById('login-email').value; const senha = document.getElementById('login-senha').value; if(!email || !senha) return window.exibirMensagemErro("Preencha todos os campos."); try { await signInWithEmailAndPassword(auth, email, senha); } catch (error) { window.exibirMensagemErro("Email ou senha incorretos."); } };
window.criarConta = async function() { const nome = document.getElementById('cad-nome').value; const idade = document.getElementById('cad-idade').value; const telefone = document.getElementById('cad-telefone').value; const email = document.getElementById('cad-email').value; const senha = document.getElementById('cad-senha').value; if(!nome || !idade || !telefone || !email || !senha) return window.exibirMensagemErro("Preencha todos os campos."); if(senha.length < 6) return window.exibirMensagemErro("A senha deve ter no mínimo 6 caracteres."); try { const userCredential = await createUserWithEmailAndPassword(auth, email, senha); window.dadosEstudo.perfil = { nome, idade, telefone, email }; await setDoc(doc(db, "usuarios", userCredential.user.uid), window.dadosEstudo); } catch (error) { window.exibirMensagemErro("Erro ao criar conta. Email já existe ou formato inválido."); } };
window.sairConta = async function() { await signOut(auth); };

function validarEstruturaDados() {
    window.dadosEstudo.materias = window.dadosEstudo.materias || [];
    window.dadosEstudo.revisoes = window.dadosEstudo.revisoes || [];
    window.dadosEstudo.historicoDias = window.dadosEstudo.historicoDias || {};
    window.dadosEstudo.pdfs = window.dadosEstudo.pdfs || [];
    window.dadosEstudo.concursos = window.dadosEstudo.concursos || [];
    window.dadosEstudo.flashcards = window.dadosEstudo.flashcards || [];
    window.dadosEstudo.resumos = window.dadosEstudo.resumos || [];
    window.dadosEstudo.historicoEstudos = window.dadosEstudo.historicoEstudos || [];
    
    if(window.dadosEstudo.configRevisaoAuto === undefined) window.dadosEstudo.configRevisaoAuto = true;
    if(window.dadosEstudo.darkMode === undefined) window.dadosEstudo.darkMode = false;
    if(window.dadosEstudo.layoutFlashcards === undefined) window.dadosEstudo.layoutFlashcards = 'grid';
    if(window.dadosEstudo.layoutResumos === undefined) window.dadosEstudo.layoutResumos = 'grid';

    window.dadosEstudo.materias.forEach(mat => {
        mat.subtemas = mat.subtemas || [];
        mat.questoes = mat.questoes || { acertos: 0, erros: 0 };
        mat.tempo = mat.tempo || 0;
    });
}

onAuthStateChanged(auth, async (user) => {
    if (user) {
        window.usuarioAtual = user; document.getElementById('tela-login').classList.add('hidden'); document.getElementById('tela-loading').classList.remove('hidden');
        try { const docRef = doc(db, "usuarios", window.usuarioAtual.uid); const docSnap = await getDoc(docRef); if (docSnap.exists()) { window.dadosEstudo = { ...window.dadosEstudo, ...docSnap.data() }; } validarEstruturaDados(); } catch(e) { console.error("Erro BD:", e); }
        document.getElementById('tela-loading').classList.add('hidden'); document.getElementById('app-principal').classList.remove('hidden'); 
        window.aplicarDarkMode(); window.checarOfensivaOnLoad(); window.aplicarConfigPomo(); window.atualizarDisplayCrono(); window.atualizarInterface();
    } else {
        window.usuarioAtual = null; document.getElementById('tela-login').classList.remove('hidden'); document.getElementById('app-principal').classList.add('hidden'); 
    }
});

window.salvarLocal = function(recarregarViews = true) {
    if(recarregarViews) { window.atualizarInterface(); }
    if(window.usuarioAtual) { setDoc(doc(db, "usuarios", window.usuarioAtual.uid), window.dadosEstudo).catch(e => console.error(e)); }
};

// =====================================
// NAVEGAÇÃO E LAYOUT
// =====================================
window.toggleDarkMode = function() { window.dadosEstudo.darkMode = !window.dadosEstudo.darkMode; window.aplicarDarkMode(); window.salvarLocal(false); window.atualizarGraficos(); };
window.aplicarDarkMode = function() { if(window.dadosEstudo.darkMode) { document.documentElement.classList.add('dark'); } else { document.documentElement.classList.remove('dark'); } };

// CONTROLE DO MENU LATERAL (SIDEBAR)
window.toggleSidebar = function() {
    document.getElementById('sidebar').classList.toggle('sidebar-collapsed');
};
if(window.innerWidth < 768) { document.getElementById('sidebar').classList.add('sidebar-collapsed'); }

window.mudarAbaNav = function(abaAlvo) {
    try {
        const titulos = { 'dashboard':'Dashboard Geral', 'calendario':'Calendário & Histórico', 'pdfs':'Meus Materiais em PDF', 'revisoes':'Gestão de Revisões', 'desempenho':'Desempenho e Gráficos', 'edital':'Controle de Edital', 'resumos':'Cadernos de Resumos', 'flashcards':'Meus Flashcards Ativos' };
        document.getElementById('header-title').innerText = titulos[abaAlvo] || "EstudoPro";
        
        ['dashboard', 'calendario', 'pdfs', 'revisoes', 'desempenho', 'edital', 'resumos', 'flashcards'].forEach(aba => {
            const viewEl = document.getElementById(`view-${aba}`);
            const btnEl = document.getElementById(`menu-${aba}`);
            if(viewEl) { viewEl.classList.add('hidden'); viewEl.classList.remove('block'); }
            if(btnEl) { btnEl.classList.remove('bg-indigo-100', 'text-indigo-700', 'border-r-4', 'border-indigo-600', 'dark:bg-gray-700', 'dark:text-indigo-400'); btnEl.classList.add('text-gray-600', 'dark:text-gray-300'); }
        });
        
        document.getElementById(`view-${abaAlvo}`).classList.remove('hidden'); document.getElementById(`view-${abaAlvo}`).classList.add('block');
        const btnAtivo = document.getElementById(`menu-${abaAlvo}`);
        if(btnAtivo) { btnAtivo.classList.remove('text-gray-600', 'dark:text-gray-300'); btnAtivo.classList.add('bg-indigo-100', 'text-indigo-700', 'border-r-4', 'border-indigo-600', 'dark:bg-gray-700', 'dark:text-indigo-400'); }
        
        if(abaAlvo === 'desempenho') { setTimeout(() => window.atualizarGraficos(), 50); }
        if(window.innerWidth < 768) { document.getElementById('sidebar').classList.add('sidebar-collapsed'); }
    } catch(e) { console.error("Erro ao mudar aba:", e); }
};

window.mudarLayout = function(tipo, layout) { if(tipo === 'flashcards') { window.dadosEstudo.layoutFlashcards = layout; window.renderizarFlashcards(); } else { window.dadosEstudo.layoutResumos = layout; window.renderizarResumos(); } window.salvarLocal(false); };

// CORREÇÃO: ABAS DE TEMPO DO DASHBOARD
window.mudarAbaTempo = function(abaClicada) {
    ['pomodoro', 'cronometro', 'manual'].forEach(abaNome => {
        const btn = document.getElementById(`tab-btn-${abaNome}`);
        const sec = document.getElementById(`aba-${abaNome}`);
        if (btn) {
            btn.classList.remove('tab-active', 'text-indigo-600', 'dark:text-indigo-400', 'border-b-2', 'border-indigo-600');
            btn.classList.add('text-gray-400');
        }
        if (sec) sec.classList.add('hidden');
    });
    
    const btnAtivo = document.getElementById(`tab-btn-${abaClicada}`);
    const secAtiva = document.getElementById(`aba-${abaClicada}`);
    
    if (btnAtivo) {
        btnAtivo.classList.remove('text-gray-400');
        btnAtivo.classList.add('tab-active', 'text-indigo-600', 'dark:text-indigo-400', 'border-b-2', 'border-indigo-600');
    }
    if (secAtiva) secAtiva.classList.remove('hidden');
};

// =====================================
// TEMPO E ATIVIDADES
// =====================================
window.adicionarHistoricoEstudo = function(minutos, materiaId, tipoStr) {
    const hoje = new Date(); const dataStr = hoje.toLocaleDateString('pt-BR'); const horaStr = hoje.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const nomeMateria = window.dadosEstudo.materias[materiaId] ? window.dadosEstudo.materias[materiaId].nome : "Geral / Sem Matéria";
    window.dadosEstudo.historicoEstudos.push({ id: Date.now(), data: dataStr, horario: horaStr, materia: nomeMateria, duracao: minutos, tipo: tipoStr });
};

let pomoTempoRestante = 25 * 60; let pomoInterval; let pomoRodando = false; let pomoEmFoco = true; let dataAlvoPomo = null;
window.aplicarConfigPomo = function() { if(!pomoRodando) { pomoTempoRestante = (parseInt(document.getElementById('cfg-pomo-foco').value) || 25) * 60; window.atualizarDisplayPomo(); } };
window.atualizarDisplayPomo = function() { let m = Math.floor(pomoTempoRestante / 60).toString().padStart(2, '0'); let s = (pomoTempoRestante % 60).toString().padStart(2, '0'); document.getElementById('display-pomo').innerText = `${m}:${s}`; };

window.iniciarPomodoro = function(isFoco) {
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
            pomoTempoRestante = 0; window.pararPomodoro(); window.tocarAlarme(); 
            if(pomoEmFoco) { 
                const min = parseInt(document.getElementById('cfg-pomo-foco').value) || 25; 
                window.dadosEstudo.tempoTotal += min; window.dadosEstudo.pomodorosRealizados++; 
                window.registrarAtividade(min, 0, 0, 0, matId); window.adicionarHistoricoEstudo(min, matId, 'Pomodoro'); 
                window.salvarLocal(true); setTimeout(() => alert("Foco Salvo no Histórico!"), 500); 
            } else { setTimeout(() => alert("Descanso Finalizado!"), 500); } 
        }
        window.atualizarDisplayPomo();
    }, 1000);
};
window.pausarPomodoroTimer = function() { clearInterval(pomoInterval); pomoRodando = false; };
window.pararPomodoro = function() { clearInterval(pomoInterval); pomoRodando = false; pomoTempoRestante = (parseInt(document.getElementById('cfg-pomo-foco').value) || 25) * 60; window.atualizarDisplayPomo(); };

let cronoSegundos = 0; let cronoInterval; let cronoRodando = false; let dataInicioCrono = null;
window.atualizarDisplayCrono = function() { let h = Math.floor(cronoSegundos / 3600).toString().padStart(2, '0'); let m = Math.floor((cronoSegundos % 3600) / 60).toString().padStart(2, '0'); let s = (cronoSegundos % 60).toString().padStart(2, '0'); document.getElementById('display-crono').innerText = `${h}:${m}:${s}`; };
window.iniciarCrono = function() { if(document.getElementById('select-materia-tempo').value === "") return alert("Selecione a matéria para cronometrar!"); if(!cronoRodando) { cronoRodando = true; dataInicioCrono = Date.now() - (cronoSegundos * 1000); cronoInterval = setInterval(() => { cronoSegundos = Math.floor((Date.now() - dataInicioCrono) / 1000); window.atualizarDisplayCrono(); }, 1000); } };
window.pausarCrono = function() { clearInterval(cronoInterval); cronoRodando = false; };
window.pararESalvarCrono = function() { 
    window.pausarCrono(); const matId = document.getElementById('select-materia-tempo').value; 
    if(matId === "" && cronoSegundos >= 60) return alert("Selecione a matéria antes de Salvar!"); 
    if(cronoSegundos >= 60) { const min = Math.floor(cronoSegundos / 60); window.dadosEstudo.tempoTotal += min; window.registrarAtividade(min, 0, 0, 0, matId); window.adicionarHistoricoEstudo(min, matId, 'Cronômetro'); window.salvarLocal(true); alert(`Salvo no Histórico: ${min} minutos!`); } 
    cronoSegundos = 0; window.atualizarDisplayCrono(); 
};

window.salvarTempoManual = function() { const horas = parseInt(document.getElementById('manual-horas').value) || 0; const minutos = parseInt(document.getElementById('manual-minutos').value) || 0; const matId = document.getElementById('select-materia-tempo').value; if (matId === "") return alert("Selecione uma matéria específica antes de registrar o tempo!"); const tMin = (horas * 60) + minutos; if (tMin <= 0) return alert("Insira um tempo válido."); window.dadosEstudo.tempoTotal += tMin; window.registrarAtividade(tMin, 0, 0, 0, matId); window.adicionarHistoricoEstudo(tMin, matId, 'Manual'); window.salvarLocal(true); document.getElementById('manual-horas').value = ''; document.getElementById('manual-minutos').value = ''; alert(`Salvo no Histórico: ${horas}h e ${minutos}m`); };

// =====================================
// ROTINAS DE RENDERIZAÇÃO
// =====================================
window.renderizarHistoricoEstudos = function() {
    try {
        const container = document.getElementById('lista-historico-estudos');
        if(!window.dadosEstudo.historicoEstudos || window.dadosEstudo.historicoEstudos.length === 0) { container.innerHTML = '<div class="h-full flex flex-col items-center justify-center text-gray-400"><i class="fa-solid fa-clock-rotate-left text-4xl mb-3 opacity-50"></i><p class="font-bold">Nenhum estudo registrado.</p></div>'; return; }
        const lista = [...window.dadosEstudo.historicoEstudos].sort((a,b) => b.id - a.id).slice(0, 50);
        let html = '';
        lista.forEach(item => {
            let corTipo = 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300';
            if(item.tipo === 'Pomodoro') corTipo = 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300';
            if(item.tipo === 'Cronômetro') corTipo = 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300';
            if(item.tipo === 'Manual') corTipo = 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300';
            html += `<div class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/30 border dark:border-gray-700 rounded-lg"><div class="flex flex-col"><span class="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">${item.data} às ${item.horario}</span><span class="font-bold text-gray-800 dark:text-gray-200 text-sm">${item.materia}</span></div><div class="flex items-center gap-3"><span class="text-xs font-bold px-2 py-1 rounded ${corTipo}">${item.tipo}</span><span class="font-black text-indigo-600 dark:text-indigo-400">${item.duracao} min</span></div></div>`;
        });
        container.innerHTML = html;
    } catch(e) { console.error("Erro Histórico:", e); }
};

window.renderizarRevisoesCompleta = function() { 
    try {
        const lr = document.getElementById('lista-revisoes-completa'); 
        if(!window.dadosEstudo.revisoes || window.dadosEstudo.revisoes.length === 0) { lr.innerHTML = "<p class='text-gray-500 dark:text-gray-400 font-bold'>Tudo em dia!</p>"; return; }
        let listaRev = [...window.dadosEstudo.revisoes].sort((a, b) => { if (a.concluida === b.concluida) return new Date(a.dataAgendada) - new Date(b.dataAgendada); return a.concluida ? 1 : -1; });
        const hojeStr = new Date().toISOString().split('T')[0];
        let htmlRev = '';
        listaRev.forEach(r => { 
            const [a, m, d] = r.dataAgendada.split('-'); 
            let statusHtml = ''; let bgCard = 'bg-white dark:bg-gray-800 border dark:border-gray-700'; let opacity = '';
            if(r.concluida) { statusHtml = '<span class="text-green-500 font-bold text-[10px] uppercase bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded">Concluída</span>'; opacity = 'opacity-60'; } 
            else if (r.dataAgendada < hojeStr) { statusHtml = '<span class="text-red-500 font-bold text-[10px] uppercase bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded">Atrasada</span>'; bgCard = 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-900'; } 
            else { statusHtml = '<span class="text-orange-500 font-bold text-[10px] uppercase bg-orange-50 dark:bg-orange-900/20 px-2 py-1 rounded">Pendente</span>'; }
            htmlRev += `<div class="${bgCard} p-4 rounded-xl shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 ${opacity} transition"><div class="flex flex-col"><div class="flex gap-2 items-center mb-1"><p class="text-xs text-gray-500 dark:text-gray-400 font-black tracking-widest"><i class="fa-regular fa-calendar mr-1"></i> ${d}/${m}/${a}</p>${statusHtml}<span class="text-[10px] font-bold text-gray-400 uppercase border px-1 rounded">${r.tipo}</span></div><p class="font-black text-gray-800 dark:text-white text-lg">${r.materia}</p> <p class="text-gray-600 dark:text-gray-300 text-sm font-medium mt-1">${r.subtema}</p></div><div class="flex gap-2 w-full md:w-auto mt-2 md:mt-0">${!r.concluida ? `<button onclick="window.concluirRevisao(${r.id})" class="flex-1 md:flex-none bg-green-500 hover:bg-green-600 text-white font-bold px-4 py-2 rounded-lg transition shadow-sm">Concluir</button>` : `<button disabled class="flex-1 md:flex-none bg-gray-300 dark:bg-gray-600 text-white font-bold px-4 py-2 rounded-lg cursor-not-allowed"><i class="fa-solid fa-check"></i> Feito</button>`}<button onclick="window.excluirRevisao(${r.id})" class="bg-gray-100 dark:bg-gray-700 text-gray-400 hover:text-red-500 hover:bg-red-50 font-bold px-4 py-2 rounded-lg transition shadow-sm"><i class="fa-solid fa-trash"></i></button></div></div>`; 
        }); 
        lr.innerHTML = htmlRev;
    } catch(e) { console.error("Erro Revisões:", e); }
};

window.renderizarFlashcards = function() {
    try {
        const grid = document.getElementById('grid-flashcards'); const filtro = document.getElementById('filtro-flashcard').value;
        let list = window.dadosEstudo.flashcards || []; if(filtro && filtro !== 'todas') list = list.filter(f => f.materia === filtro);
        document.getElementById('btn-layout-fc-grid').className = window.dadosEstudo.layoutFlashcards === 'grid' ? "px-3 py-1 rounded bg-white dark:bg-gray-600 shadow-sm text-indigo-600 dark:text-indigo-400 transition" : "px-3 py-1 rounded text-gray-500 dark:text-gray-400 hover:text-indigo-600 transition";
        document.getElementById('btn-layout-fc-lista').className = window.dadosEstudo.layoutFlashcards === 'lista' ? "px-3 py-1 rounded bg-white dark:bg-gray-600 shadow-sm text-indigo-600 dark:text-indigo-400 transition" : "px-3 py-1 rounded text-gray-500 dark:text-gray-400 hover:text-indigo-600 transition";
        if(list.length === 0) { grid.innerHTML = '<p class="text-gray-400 col-span-full font-bold">Nenhum flashcard criado ainda.</p>'; return; }
        let htmlGrid = '';
        if(window.dadosEstudo.layoutFlashcards === 'grid') {
            grid.className = "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6";
            list.forEach(f => { htmlGrid += `<div class="flip-card perspective-1000 w-full h-56 cursor-pointer group" onclick="this.classList.toggle('flipped')"><div class="flip-card-inner relative w-full h-full transform-style-3d"><div class="absolute w-full h-full backface-hidden bg-white dark:bg-gray-800 rounded-2xl shadow-md p-6 flex flex-col justify-center items-center text-center border-t-4 border-indigo-500 dark:border-gray-600"><span class="absolute top-2 left-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">${f.materia}</span><button onclick="event.stopPropagation(); window.deletarFlashcard(${f.id})" class="absolute top-2 right-2 text-gray-300 hover:text-red-500 hidden group-hover:block transition z-10"><i class="fa-solid fa-trash"></i></button><p class="font-black text-gray-800 dark:text-gray-100 text-lg md:text-xl leading-tight">${f.frente}</p><span class="absolute bottom-3 text-xs text-indigo-400 dark:text-indigo-500 font-bold bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1 rounded-full"><i class="fa-solid fa-rotate mr-1"></i> Clicar para virar</span></div><div class="absolute w-full h-full backface-hidden bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-2xl shadow-md p-6 flex flex-col justify-center items-center text-center rotate-y-180 overflow-y-auto scroll-custom"><p class="text-white font-bold text-base md:text-lg leading-relaxed">${f.verso}</p></div></div></div>`; });
        } else {
            grid.className = "flex flex-col gap-3";
            list.forEach(f => { htmlGrid += `<div class="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-xl shadow-sm overflow-hidden group"><div class="p-4 bg-gray-50 dark:bg-gray-700/50 flex justify-between items-center cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition" onclick="window.alternarFlashcardLista(${f.id})"><div class="flex items-center gap-4"><span class="text-[10px] font-black text-white bg-indigo-500 px-2 py-1 rounded uppercase tracking-widest hidden md:block shadow-sm">${f.materia}</span><p class="font-bold text-gray-800 dark:text-white text-base">${f.frente}</p></div><div class="flex items-center gap-4"><button onclick="event.stopPropagation(); window.deletarFlashcard(${f.id})" class="text-gray-300 hover:text-red-500 transition" title="Apagar Cartão"><i class="fa-solid fa-trash"></i></button><i class="fa-solid fa-chevron-down text-gray-400"></i></div></div><div id="fc-verso-${f.id}" class="hidden p-6 border-t dark:border-gray-700 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-900 dark:text-indigo-100 text-base"><p class="font-bold whitespace-pre-wrap">${f.verso}</p></div></div>`; });
        }
        grid.innerHTML = htmlGrid;
    } catch(e) { console.error("Erro Flashcards:", e); }
};

window.renderizarResumos = function() {
    try {
        const lista = document.getElementById('lista-meus-resumos'); const filtro = document.getElementById('filtro-resumo').value;
        let list = window.dadosEstudo.resumos || []; if(filtro && filtro !== 'todas') list = list.filter(r => r.materia === filtro);
        document.getElementById('btn-layout-res-grid').className = window.dadosEstudo.layoutResumos === 'grid' ? "px-3 py-1 rounded bg-white dark:bg-gray-600 shadow-sm text-green-600 dark:text-green-400 transition" : "px-3 py-1 rounded text-gray-500 dark:text-gray-400 hover:text-green-600 transition";
        document.getElementById('btn-layout-res-lista').className = window.dadosEstudo.layoutResumos === 'lista' ? "px-3 py-1 rounded bg-white dark:bg-gray-600 shadow-sm text-green-600 dark:text-green-400 transition" : "px-3 py-1 rounded text-gray-500 dark:text-gray-400 hover:text-green-600 transition";
        if(list.length === 0) { lista.innerHTML = '<p class="text-gray-400 col-span-full font-bold">Nenhum resumo criado ainda.</p>'; return; }
        lista.className = window.dadosEstudo.layoutResumos === 'grid' ? "grid grid-cols-1 lg:grid-cols-2 gap-6" : "flex flex-col gap-4";
        let htmlLista = '';
        list.forEach(r => { const textoFormatado = r.conteudo.replace(/\n/g, '<br>'); htmlLista += `<div class="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-2xl shadow-sm overflow-hidden flex flex-col"><div class="p-5 bg-gray-50 dark:bg-gray-700/50 flex justify-between items-center cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition" onclick="window.alternarResumo(${r.id})"><div class="flex flex-col"><span class="text-xs font-black text-green-600 dark:text-green-400 uppercase tracking-widest mb-1">${r.materia}</span><h3 class="font-black text-gray-800 dark:text-white text-lg">${r.titulo}</h3><span class="text-xs font-bold text-gray-400 dark:text-gray-500 mt-1"><i class="fa-regular fa-calendar mr-1"></i>${r.data}</span></div><div class="flex gap-4 items-center"><button onclick="event.stopPropagation(); window.deletarResumo(${r.id})" class="text-gray-300 hover:text-red-500 transition text-lg p-2"><i class="fa-solid fa-trash"></i></button><i class="fa-solid fa-chevron-down text-gray-400"></i></div></div><div id="cont-resumo-${r.id}" class="hidden p-6 md:p-8 border-t dark:border-gray-700 text-gray-700 dark:text-gray-200 text-base leading-relaxed max-h-[500px] overflow-y-auto scroll-custom font-medium">${textoFormatado}</div></div>`; });
        lista.innerHTML = htmlLista;
    } catch(e) { console.error("Erro Resumos:", e); }
};

window.renderizarTopBar = function() {
    try {
        const selectConc = document.getElementById('select-concurso'); const dataDisp = document.getElementById('display-concurso-data'); const diasDisp = document.getElementById('dias-restantes');
        let htmlSelectConc = '<option value="" class="text-gray-800 dark:text-white">Selecione uma prova...</option>';
        if(window.dadosEstudo.concursos) { window.dadosEstudo.concursos.forEach(c => { htmlSelectConc += `<option value="${c.id}" class="text-gray-800 dark:text-white">${c.nome}</option>`; }); }
        selectConc.innerHTML = htmlSelectConc;
        if(window.dadosEstudo.concursoAtivo) { selectConc.value = window.dadosEstudo.concursoAtivo; const conc = window.dadosEstudo.concursos.find(c => c.id === window.dadosEstudo.concursoAtivo); if(conc) { if(conc.data) { const dp = conc.data.split('-'); dataDisp.innerText = `${dp[2]}/${dp[1]}/${dp[0]}`; diasDisp.innerText = window.calcularDiasRestantes(conc.data); } else { dataDisp.innerText = 'Sem data'; diasDisp.innerText = '--'; } } } else { dataDisp.innerText = '--/--/----'; diasDisp.innerText = '--'; }
        document.getElementById('config-revisoes-input').value = window.dadosEstudo.intervalosRevisao.join(', '); document.getElementById('check-rev-auto').checked = window.dadosEstudo.configRevisaoAuto;
        document.getElementById('display-ofensiva').innerText = window.dadosEstudo.ofensiva.dias; document.getElementById('display-pomodoros').innerText = window.dadosEstudo.pomodorosRealizados; document.getElementById('display-paginas').innerText = window.dadosEstudo.paginasLidas; document.getElementById('display-questoes-totais').innerText = window.dadosEstudo.questoesGerais.acertos + window.dadosEstudo.questoesGerais.erros; const h = Math.floor(window.dadosEstudo.tempoTotal / 60); const m = window.dadosEstudo.tempoTotal % 60; document.getElementById('display-tempo').innerText = `${h}h ${m}m`;
        const cal = document.getElementById('calendario-grid'); const hj = new Date(); document.getElementById('mes-atual-label').innerText = hj.toLocaleString('pt-BR', { month: 'long', year: 'numeric' }).toUpperCase();
        const a = hj.getFullYear(); const mes = hj.getMonth(); const pD = new Date(a, mes, 1).getDay(); const dM = new Date(a, mes + 1, 0).getDate(); const hjStr = a + '-' + String(mes+1).padStart(2,'0') + '-' + String(hj.getDate()).padStart(2,'0');
        let htmlCal = '';
        for(let i=0; i<pD; i++) htmlCal += `<div></div>`;
        for(let d=1; d<=dM; d++) { const dataStr = `${a}-${String(mes+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`; const est = window.dadosEstudo.historicoDias[dataStr]; let cls = 'bg-gray-100 dark:bg-gray-700 rounded text-gray-400 dark:text-gray-500'; let title = `${d}/${mes+1} - Sem estudos`; if (est && (est.minutos > 0 || est.acertos > 0 || est.paginas > 0)) { cls = 'bg-green-500 text-white rounded shadow-sm'; title = `${d}/${mes+1}: ${est.minutos}min | ${est.acertos+est.erros}q | ${est.paginas}pág`; } else if (dataStr === hjStr) { cls = 'bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200 rounded border border-indigo-300 dark:border-indigo-700'; title = `Hoje!`; } htmlCal += `<div class="p-2 cursor-help transition hover:opacity-80 ${cls}" title="${title}">${d}</div>`; }
        cal.innerHTML = htmlCal;
    } catch(e) { console.error("Erro TopBar:", e); }
};

window.renderizarEditalCompleto = function() {
    try {
        const listaEd = document.getElementById('lista-edital-completa');
        let htmlEdital = !window.dadosEstudo.materias || window.dadosEstudo.materias.length === 0 ? "<div class='text-center p-12 text-gray-400 font-bold bg-gray-50 dark:bg-gray-700/30 rounded-2xl'>Nenhuma matéria cadastrada no edital.</div>" : "";
        (window.dadosEstudo.materias || []).forEach((mat, iMat) => {
            const isExp = mat.expandido === undefined ? true : mat.expandido; const iconDir = isExp ? 'fa-chevron-up' : 'fa-chevron-down'; const displaySub = isExp ? 'block' : 'hidden';
            const ht = Math.floor((mat.tempo || 0) / 60); const mt = (mat.tempo || 0) % 60; let tFormat = mat.tempo ? (ht > 0 ? ht+'h ' : '') + mt+'m' : '0m';
            const subtemas = mat.subtemas || []; const concl = subtemas.filter(s => s.concluido).length; const pctEd = subtemas.length === 0 ? 0 : Math.round((concl / subtemas.length) * 100);
            let subs = subtemas.map((s, iSub) => `<div class="flex justify-between items-center mt-2 ml-4 p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg group transition"><div class="flex items-center gap-3 flex-1"><input type="checkbox" ${s.concluido ? 'checked' : ''} onchange="window.alternarConclusao(${iMat}, ${iSub})" class="w-5 h-5 text-indigo-600 rounded cursor-pointer border-gray-300"><span class="${s.concluido ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-700 dark:text-gray-200'} font-medium text-base">${s.nome}</span></div><button onclick="window.deletarSubtema(${iMat}, ${iSub})" class="text-gray-300 dark:text-gray-600 hover:text-red-500 hidden group-hover:block transition px-2" title="Apagar Tópico"><i class="fa-solid fa-trash text-sm"></i></button></div>`).join('');
            htmlEdital += `<div class="border dark:border-gray-700 rounded-2xl p-6 bg-white dark:bg-gray-800 mb-6 shadow-sm border-l-[6px] border-l-indigo-500 transicao-suave"><div class="flex justify-between items-center mb-4"><div class="flex-1 cursor-pointer flex items-center gap-3" onclick="window.alternarExpandirMateria(${iMat})"><div class="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex justify-center items-center"><i class="fa-solid ${iconDir} text-gray-500 dark:text-gray-400"></i></div><h3 class="font-black text-xl text-gray-800 dark:text-white">${mat.nome} <span class="text-xs font-bold text-indigo-600 dark:text-indigo-400 ml-3 bg-indigo-50 dark:bg-indigo-900/50 px-3 py-1.5 rounded-full uppercase tracking-wider"><i class="fa-solid fa-clock"></i> ${tFormat}</span></h3> </div><button onclick="window.deletarMateria(${iMat})" class="text-gray-400 hover:text-red-500 bg-gray-50 dark:bg-gray-700 hover:bg-red-50 w-10 h-10 rounded-full flex justify-center items-center transition" title="Apagar Matéria e Histórico"><i class="fa-solid fa-trash"></i></button></div><div class="flex items-center gap-3 mb-4"><div class="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-3"><div class="bg-gradient-to-r from-indigo-500 to-indigo-600 h-3 rounded-full transition-all" style="width: ${pctEd}%"></div></div><span class="text-sm font-black text-indigo-600 dark:text-indigo-400 w-10 text-right">${pctEd}%</span></div><div class="${displaySub} transicao-suave mt-4 border-t dark:border-gray-700 pt-4"><div class="flex gap-3 mb-4 ml-4"><input type="text" id="novo-subtema-${iMat}" placeholder="Adicionar novo tópico..." class="text-base font-medium p-2.5 bg-gray-50 dark:bg-gray-700 dark:text-white border dark:border-gray-600 rounded-lg flex-1 outline-none focus:ring-2 focus:ring-indigo-500"><button onclick="window.adicionarSubtema(${iMat})" class="bg-gray-200 dark:bg-gray-600 dark:text-white px-6 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 font-bold transition">Adicionar</button></div><div class="max-h-96 overflow-y-auto scroll-custom border-l-2 border-gray-100 dark:border-gray-700 ml-6 pl-2">${subs}</div></div></div>`;
        });
        listaEd.innerHTML = htmlEdital;
    } catch(e) { console.error("Erro Edital:", e); }
};

window.renderizarTabelasEListas = function() {
    try {
        const listaPdfs = document.getElementById('lista-pdfs'); 
        let htmlPdfs = !window.dadosEstudo.pdfs || window.dadosEstudo.pdfs.length === 0 ? "<p class='text-gray-400 font-bold text-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl'>Nenhum PDF adicionado.</p>" : ""; 
        (window.dadosEstudo.pdfs || []).forEach(p => { 
            let pct = p.totalPaginas > 0 ? Math.round((p.lidas / p.totalPaginas) * 100) : 0; 
            let actionBtn = p.link ? `<button onclick="window.abrirLeitorPdf('${p.link}')" class="text-white bg-blue-500 hover:bg-blue-600 px-3 py-1 rounded text-xs font-bold transition shadow-sm whitespace-nowrap"><i class="fa-solid fa-cloud"></i> Abrir Link</button>` : `<span class="text-[10px] bg-gray-200 dark:bg-gray-600 text-gray-500 dark:text-gray-300 px-2 py-1 rounded font-bold uppercase">Arquivo Local</span>`; 
            htmlPdfs += `<div class="border dark:border-gray-700 rounded-xl p-4 bg-gray-50 dark:bg-gray-700 shadow-sm border-l-4 border-red-500"><div class="flex justify-between items-start mb-3"><div class="flex-1 pr-2"><p class="font-black text-gray-800 dark:text-white text-base leading-tight mb-1">${p.nome}</p>${actionBtn}</div><button onclick="window.deletarPdf(${p.id})" class="text-gray-400 hover:text-red-500 transition"><i class="fa-solid fa-trash"></i></button></div><div class="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1 font-black uppercase tracking-wider"><span>Lidas: ${p.lidas}/${p.totalPaginas}</span> <span>Pág. Atual: ${p.ultimaPagina}</span></div><div class="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2 mb-4"><div class="bg-red-500 h-2 rounded-full" style="width: ${pct}%"></div></div><div class="flex items-center gap-2 text-sm"><input type="number" id="pdf-ini-${p.id}" placeholder="Início" class="border dark:border-gray-500 dark:bg-gray-800 dark:text-white p-2 w-16 rounded-lg text-center font-bold outline-none focus:ring-1 focus:ring-red-400"><span class="dark:text-gray-400 font-bold">à</span><input type="number" id="pdf-fim-${p.id}" placeholder="Fim" class="border dark:border-gray-500 dark:bg-gray-800 dark:text-white p-2 w-16 rounded-lg text-center font-bold outline-none focus:ring-1 focus:ring-red-400"><button onclick="window.atualizarLeituraPdf(${p.id})" class="bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 px-3 py-2 rounded-lg font-black hover:bg-green-200 dark:hover:bg-green-800 flex-1 transition shadow-sm">+ Registrar</button></div></div>`; 
        });
        listaPdfs.innerHTML = htmlPdfs;
        
        let htmlMatQ = '<option value="">Selecione a matéria...</option>'; 
        let htmlMatT = '<option value="" disabled selected>Selecione a matéria...</option>'; 
        let htmlMatF = '<option value="" disabled selected>Selecione a matéria...</option>';
        let htmlMatR = '<option value="" disabled selected>Selecione a matéria...</option>';
        let htmlFiltro = '<option value="todas">Todas as Matérias</option>';
        let htmlTabQ = "";

        (window.dadosEstudo.materias || []).forEach((mat, iMat) => { 
            htmlMatQ += `<option value="${iMat}">${mat.nome}</option>`; htmlMatT += `<option value="${iMat}">${mat.nome}</option>`; htmlMatF += `<option value="${mat.nome}">${mat.nome}</option>`; htmlMatR += `<option value="${mat.nome}">${mat.nome}</option>`; htmlFiltro += `<option value="${mat.nome}">${mat.nome}</option>`; 
            const questoes = mat.questoes || { acertos: 0, erros: 0 }; const tM = questoes.acertos + questoes.erros; const pctM = tM === 0 ? 0 : Math.round((questoes.acertos / tM)*100); 
            htmlTabQ += `<tr class="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition"><td class="py-3 px-2 font-black text-gray-700 dark:text-gray-200">${mat.nome}</td> <td class="py-3 text-center text-gray-500 dark:text-gray-400 font-bold">${tM}</td><td class="py-3 text-center font-black text-green-600 dark:text-green-400">${questoes.acertos}</td> <td class="py-3 text-center font-black text-red-500 dark:text-red-400">${questoes.erros}</td><td class="py-3 text-right px-2 font-black ${pctM >= 80 ? 'text-green-600 dark:text-green-400' : (pctM>=60 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-500 dark:text-red-400')}">${pctM}%</td> </tr>`; 
        });

        document.getElementById('select-materia-questoes').innerHTML = htmlMatQ; document.getElementById('select-materia-tempo').innerHTML = htmlMatT; document.getElementById('select-materia-flashcard').innerHTML = htmlMatF; document.getElementById('select-materia-resumo').innerHTML = htmlMatR; document.getElementById('filtro-flashcard').innerHTML = htmlFiltro; document.getElementById('filtro-resumo').innerHTML = htmlFiltro; document.getElementById('tabela-questoes').innerHTML = htmlTabQ;
    } catch(e) { console.error("Erro Tabelas:", e); }
};

window.atualizarGraficos = function() {
    try {
        if (typeof Chart === 'undefined') return;
        const textColor = window.dadosEstudo.darkMode ? '#9ca3af' : '#6b7280'; Chart.defaults.color = textColor;
        let totQ = window.dadosEstudo.questoesGerais.acertos + window.dadosEstudo.questoesGerais.erros; 
        
        if(chartGeral) chartGeral.destroy(); 
        chartGeral = new Chart(document.getElementById('graficoGeral').getContext('2d'), { type: 'doughnut', data: { labels: totQ>0?['Acertos', 'Erros']:['Sem Dados'], datasets: [{ data: totQ>0?[window.dadosEstudo.questoesGerais.acertos, window.dadosEstudo.questoesGerais.erros]:[1], backgroundColor: totQ>0?['#10b981', '#ef4444']:['#e5e7eb'], borderWidth: 0 }] }, options: { responsive: true, maintainAspectRatio: false, cutout: '70%', plugins: { legend: { display: false }, title: { display: true, text: 'Visão Geral (Feitas)', color: textColor, font: { size: 14, weight: 'bold' } }, tooltip: { enabled: totQ>0, callbacks: { label: function(context) { return ' ' + context.label + ': ' + context.parsed + ' questões'; } } } } } });

        const labelsM = [], dadosM = [], coresM = [], labelsT = [], dadosT = [];
        window.dadosEstudo.materias.forEach(m => { 
            const nomeGrafico = m.nome.length > 20 ? m.nome.substring(0, 20) + '...' : m.nome;
            const questoes = m.questoes || { acertos: 0, erros: 0 };
            if(questoes.acertos > 0 || questoes.erros > 0) { labelsM.push(nomeGrafico); const pct = Math.round((questoes.acertos / (questoes.acertos + questoes.erros)) * 100); dadosM.push(pct); coresM.push(pct >= 80 ? '#10b981' : (pct >= 60 ? '#f59e0b' : '#ef4444')); } 
            if(m.tempo && m.tempo > 0) { labelsT.push(nomeGrafico); dadosT.push((m.tempo / 60).toFixed(1)); } 
        });

        if(chartMaterias) chartMaterias.destroy(); 
        chartMaterias = new Chart(document.getElementById('graficoMaterias').getContext('2d'), { type: 'bar', data: { labels: labelsM.length > 0 ? labelsM : ['-'], datasets: [{ data: dadosM.length > 0 ? dadosM : [0], backgroundColor: coresM.length > 0 ? coresM : ['#374151'], borderRadius: 6 }] }, options: { responsive: true, maintainAspectRatio: false, scales: { y: { max: 100, grid: { color: window.dadosEstudo.darkMode ? '#374151' : '#e5e7eb' } }, x: { grid: { color: window.dadosEstudo.darkMode ? '#374151' : '#e5e7eb' } } }, plugins: { legend: { display: false }, title: { display: true, text: 'Aproveitamento Individual (%)', color: textColor, font: { size: 14, weight: 'bold' } }, tooltip: { callbacks: { label: function(context) { return ' Aproveitamento: ' + context.parsed.y + '%'; } } } } } });
        
        if(chartTempoMat) chartTempoMat.destroy(); 
        chartTempoMat = new Chart(document.getElementById('graficoTempoMateria').getContext('2d'), { type: 'bar', data: { labels: labelsT.length > 0 ? labelsT : ['-'], datasets: [{ label: 'Horas', data: dadosT.length > 0 ? dadosT : [0], backgroundColor: '#4f46e5', borderRadius: 6 }] }, options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, grid: { color: window.dadosEstudo.darkMode ? '#374151' : '#e5e7eb' } }, x: { grid: { color: window.dadosEstudo.darkMode ? '#374151' : '#e5e7eb' } } }, plugins: { legend: { display: false }, tooltip: { callbacks: { label: function(context) { return ' Tempo: ' + context.parsed.y + ' hora(s)'; } } } } } });
        
        const evoLabels = []; const evoMin = []; const evoQtd = [];
        for(let i=6; i>=0; i--) { let d = new Date(); d.setDate(d.getDate() - i); let dStr = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0'); evoLabels.push(`${d.getDate()}/${d.getMonth()+1}`); let h = window.dadosEstudo.historicoDias[dStr] || { minutos:0, acertos:0, erros:0 }; evoMin.push(h.minutos); evoQtd.push(h.acertos + h.erros); }
        
        if(chartEvolucao) chartEvolucao.destroy(); 
        chartEvolucao = new Chart(document.getElementById('graficoEvolucao').getContext('2d'), { type: 'line', data: { labels: evoLabels, datasets: [ { label: 'Minutos', data: evoMin, borderColor: '#4f46e5', backgroundColor: 'rgba(79, 70, 229, 0.1)', fill: true, tension: 0.4, borderWidth: 3 }, { label: 'Questões', data: evoQtd, borderColor: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.1)', fill: true, tension: 0.4, borderWidth: 3 } ] }, options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, grid: { color: window.dadosEstudo.darkMode ? '#374151' : '#e5e7eb' } }, x: { grid: { color: window.dadosEstudo.darkMode ? '#374151' : '#e5e7eb' } } }, plugins: { legend: { position: 'top', labels: { color: textColor, font: { weight: 'bold' } } } } } });
    } catch(e) { console.error("Erro Gráficos:", e); }
};

window.atualizarInterface = function() { 
    window.renderizarTopBar(); window.renderizarTabelasEListas(); window.renderizarEditalCompleto(); window.renderizarRevisoesCompleta(); window.renderizarFlashcards(); window.renderizarResumos(); window.renderizarHistoricoEstudos(); 
};

// =====================================
// FUNÇÕES AUXILIARES DE NEGÓCIO (CRUD)
// =====================================
window.calcularDiasRestantes = function(dataStr) { if(!dataStr) return "--"; const partes = dataStr.split('-'); if(partes.length !== 3) return "--"; const dp = new Date(partes[0], partes[1] - 1, partes[2]); dp.setHours(23, 59, 59); const diff = dp - new Date(); return diff < 0 ? "0" : Math.ceil(diff / (1000 * 60 * 60 * 24)); };
window.parseDateLocal = function(dateStr) { const [y, m, d] = dateStr.split('-'); return new Date(y, m - 1, d); };
window.checarOfensivaOnLoad = function() { const hL = new Date(); const hjStr = hL.getFullYear() + '-' + String(hL.getMonth()+1).padStart(2,'0') + '-' + String(hL.getDate()).padStart(2,'0'); const ult = window.dadosEstudo.ofensiva.ultimaData; if (ult && ult !== hjStr) { const diffDays = Math.ceil(Math.abs(window.parseDateLocal(hjStr) - window.parseDateLocal(ult)) / (1000 * 60 * 60 * 24)); if (diffDays > 1) { window.dadosEstudo.ofensiva.dias = 0; window.salvarLocal(false); } } };
window.registrarAtividade = function(minAdd=0, acAdd=0, erAdd=0, pagAdd=0, iMat="") { const hL = new Date(); const hjStr = hL.getFullYear() + '-' + String(hL.getMonth()+1).padStart(2,'0') + '-' + String(hL.getDate()).padStart(2,'0'); if(!window.dadosEstudo.historicoDias[hjStr]) window.dadosEstudo.historicoDias[hjStr] = { minutos: 0, acertos: 0, erros: 0, paginas: 0 }; let h = window.dadosEstudo.historicoDias[hjStr]; h.minutos += minAdd; h.acertos += acAdd; h.erros += erAdd; h.paginas += pagAdd; if(minAdd > 0 && iMat !== "") { window.dadosEstudo.materias[iMat].tempo += minAdd; } const ult = window.dadosEstudo.ofensiva.ultimaData; if (ult !== hjStr) { if (ult) { const diff = Math.ceil(Math.abs(window.parseDateLocal(hjStr) - window.parseDateLocal(ult)) / (1000 * 60 * 60 * 24)); if (diff === 1) window.dadosEstudo.ofensiva.dias++; else window.dadosEstudo.ofensiva.dias = 1; } else window.dadosEstudo.ofensiva.dias = 1; window.dadosEstudo.ofensiva.ultimaData = hjStr; } };
window.mostrarFormConcurso = function() { document.getElementById('form-novo-concurso').classList.remove('hidden'); document.getElementById('form-novo-concurso').classList.add('flex'); };
window.esconderFormConcurso = function() { document.getElementById('form-novo-concurso').classList.add('hidden'); document.getElementById('form-novo-concurso').classList.remove('flex'); };
window.adicionarConcurso = function() { const nome = document.getElementById('novo-concurso-nome').value.trim(); const data = document.getElementById('novo-concurso-data').value; if(!nome) return alert('Preencha o Nome.'); const id = Date.now(); window.dadosEstudo.concursos.push({ id: id, nome: nome, data: data || "" }); window.dadosEstudo.concursoAtivo = id; document.getElementById('novo-concurso-nome').value = ''; document.getElementById('novo-concurso-data').value = ''; window.esconderFormConcurso(); window.salvarLocal(true); };
window.mudarConcursoAtivo = function() { const val = document.getElementById('select-concurso').value; window.dadosEstudo.concursoAtivo = val ? parseInt(val) : null; window.salvarLocal(false); };
window.deletarConcursoAtivo = function() { if(!window.dadosEstudo.concursoAtivo) return alert("Nenhum concurso selecionado."); if(confirm("Apagar este concurso?")) { window.dadosEstudo.concursos = window.dadosEstudo.concursos.filter(c => c.id !== window.dadosEstudo.concursoAtivo); window.dadosEstudo.concursoAtivo = window.dadosEstudo.concursos.length > 0 ? window.dadosEstudo.concursos[0].id : null; window.salvarLocal(true); } };
window.resetarPaginas = function() { if(confirm("Zerar as páginas?")) { window.dadosEstudo.paginasLidas = 0; window.dadosEstudo.pdfs.forEach(p => { p.lidas = 0; p.ultimaPagina = 0; }); Object.keys(window.dadosEstudo.historicoDias).forEach(d => { window.dadosEstudo.historicoDias[d].paginas = 0; }); window.salvarLocal(true); } };
window.resetarQuestoes = function() { if(confirm("Zerar questões?")) { window.dadosEstudo.questoesGerais = { acertos: 0, erros: 0 }; window.dadosEstudo.materias.forEach(m => { if(m.questoes) m.questoes = { acertos: 0, erros: 0 }; }); Object.keys(window.dadosEstudo.historicoDias).forEach(d => { window.dadosEstudo.historicoDias[d].acertos = 0; window.dadosEstudo.historicoDias[d].erros = 0; }); window.salvarLocal(true); } };
window.resetarTempo = function() { if(confirm("Zerar histórico de tempo?")) { window.dadosEstudo.tempoTotal = 0; window.dadosEstudo.materias.forEach(m => m.tempo = 0); Object.keys(window.dadosEstudo.historicoDias).forEach(d => { window.dadosEstudo.historicoDias[d].minutos = 0; }); window.salvarLocal(true); } };
window.resetarPomodoros = function() { if(confirm("Zerar pomodoros?")) { window.dadosEstudo.pomodorosRealizados = 0; window.salvarLocal(true); } };
window.resetarCalendario = function() { if(confirm("Limpar visual do calendário?")) { window.dadosEstudo.historicoDias = {}; window.salvarLocal(true); } };
window.adicionarMateriaEmMassa = function() { const nome = document.getElementById('nova-materia').value.trim(); const texto = document.getElementById('texto-edital').value; if (!nome) return alert("Digite o nome da matéria!"); const linhas = texto.split(/\n|,|\.\s/).map(l => l.trim()).filter(l => l !== ""); const subtemas = linhas.map(l => ({ nome: l, concluido: false })); window.dadosEstudo.materias.push({ nome, subtemas, questoes: { acertos: 0, erros: 0 }, tempo: 0, expandido: true }); document.getElementById('nova-materia').value = ""; document.getElementById('texto-edital').value = ""; window.salvarLocal(true); };
window.adicionarSubtema = function(i) { const inp = document.getElementById(`novo-subtema-${i}`); if (inp.value.trim()) { window.dadosEstudo.materias[i].subtemas.push({ nome: inp.value.trim(), concluido: false }); inp.value = ""; window.salvarLocal(false); window.renderizarEditalCompleto(); } };
window.toggleRevisaoAuto = function() { window.dadosEstudo.configRevisaoAuto = document.getElementById('check-rev-auto').checked; window.salvarLocal(false); };
window.alternarConclusao = function(iMat, iSub) { const sub = window.dadosEstudo.materias[iMat].subtemas[iSub]; sub.concluido = !sub.concluido; if (sub.concluido) { if(window.dadosEstudo.configRevisaoAuto) { window.agendarRevisoes(window.dadosEstudo.materias[iMat].nome, sub.nome); } window.registrarAtividade(0,0,0,0); } window.salvarLocal(false); window.renderizarEditalCompleto(); };
window.deletarMateria = function(i) { if (confirm("Excluir matéria e histórico?")) { let mat = window.dadosEstudo.materias[i]; if(mat.questoes) { window.dadosEstudo.questoesGerais.acertos = Math.max(0, window.dadosEstudo.questoesGerais.acertos - mat.questoes.acertos); window.dadosEstudo.questoesGerais.erros = Math.max(0, window.dadosEstudo.questoesGerais.erros - mat.questoes.erros); } if(mat.tempo) window.dadosEstudo.tempoTotal = Math.max(0, window.dadosEstudo.tempoTotal - mat.tempo); window.dadosEstudo.materias.splice(i, 1); window.salvarLocal(true); } };
window.deletarSubtema = function(iMat, iSub) { if (confirm("Excluir este tópico específico?")) { window.dadosEstudo.materias[iMat].subtemas.splice(iSub, 1); window.salvarLocal(false); window.renderizarEditalCompleto(); } };
window.alternarExpandirMateria = function(iMat) { if(window.dadosEstudo.materias[iMat].expandido === undefined) window.dadosEstudo.materias[iMat].expandido = true; window.dadosEstudo.materias[iMat].expandido = !window.dadosEstudo.materias[iMat].expandido; window.salvarLocal(false); window.renderizarEditalCompleto(); };
window.adicionarPdf = function() { let nome = document.getElementById('pdf-nome').value.trim(); let link = document.getElementById('pdf-link').value.trim(); let total = parseInt(document.getElementById('pdf-total').value); if(nome && total > 0) { window.dadosEstudo.pdfs.push({ id: Date.now(), nome, link, totalPaginas: total, lidas: 0, ultimaPagina: 0 }); document.getElementById('pdf-nome').value = ""; document.getElementById('pdf-link').value = ""; document.getElementById('pdf-total').value = ""; window.salvarLocal(true); } else alert("Preencha corretamente."); };
window.atualizarLeituraPdf = function(id) { let ini = parseInt(document.getElementById(`pdf-ini-${id}`).value); let fim = parseInt(document.getElementById(`pdf-fim-${id}`).value); if (!isNaN(ini) && !isNaN(fim) && fim >= ini) { let qtd = (fim - ini) + 1; let pdf = window.dadosEstudo.pdfs.find(p => p.id === id); if(pdf) { pdf.lidas += qtd; if(pdf.lidas > pdf.totalPaginas) pdf.lidas = pdf.totalPaginas; pdf.ultimaPagina = fim; window.dadosEstudo.paginasLidas += qtd; window.registrarAtividade(0, 0, 0, qtd); window.salvarLocal(true); } } else alert("Intervalo inválido."); };
window.deletarPdf = function(id) { if(confirm("Excluir PDF?")) { window.dadosEstudo.pdfs = window.dadosEstudo.pdfs.filter(p => p.id !== id); window.salvarLocal(true); } };
window.abrirPdfLocal = function(event) { const file = event.target.files[0]; if (file && file.type === "application/pdf") { const fileURL = URL.createObjectURL(file); window.abrirLeitorPdf(fileURL); } else { alert("Por favor, selecione um arquivo PDF válido."); } };
window.abrirLeitorPdf = function(url) { document.getElementById('leitor-placeholder').classList.add('hidden'); const iframe = document.getElementById('pdf-viewer'); iframe.src = url; iframe.classList.remove('hidden'); document.getElementById('btn-fechar-pdf').classList.remove('hidden'); };
window.fecharLeitorPdf = function() { const iframe = document.getElementById('pdf-viewer'); iframe.src = ""; iframe.classList.add('hidden'); document.getElementById('btn-fechar-pdf').classList.add('hidden'); document.getElementById('leitor-placeholder').classList.remove('hidden'); };
window.salvarQuestoes = function() { const i = document.getElementById('select-materia-questoes').value; const ac = parseInt(document.getElementById('input-acertos').value) || 0; const er = parseInt(document.getElementById('input-erros').value) || 0; if (i === "" || (ac === 0 && er === 0)) return alert("Selecione matéria e valores."); window.dadosEstudo.questoesGerais.acertos += ac; window.dadosEstudo.questoesGerais.erros += er; if(!window.dadosEstudo.materias[i].questoes) window.dadosEstudo.materias[i].questoes = { acertos: 0, erros: 0 }; window.dadosEstudo.materias[i].questoes.acertos += ac; window.dadosEstudo.materias[i].questoes.erros += er; document.getElementById('input-acertos').value = ""; document.getElementById('input-erros').value = ""; window.registrarAtividade(0, ac, er, 0); window.salvarLocal(true); };
window.salvarConfigRevisoes = function() { const nums = document.getElementById('config-revisoes-input').value.split(',').map(n => parseInt(n.trim())).filter(n => !isNaN(n)); if(nums.length > 0) { window.dadosEstudo.intervalosRevisao = nums; window.salvarLocal(false); } else { document.getElementById('config-revisoes-input').value = window.dadosEstudo.intervalosRevisao.join(', '); } };
window.agendarRevisoes = function(mat, sub) { const hoje = new Date(); window.dadosEstudo.intervalosRevisao.forEach(d => { let data = new Date(hoje); data.setDate(hoje.getDate() + d); window.dadosEstudo.revisoes.push({ id: Date.now() + Math.random(), materia: mat, subtema: sub, dataAgendada: data.toISOString().split('T')[0], tipo: `${d}d` }); }); window.dadosEstudo.revisoes.sort((a, b) => new Date(a.dataAgendada) - new Date(b.dataAgendada)); };

window.salvarFlashcard = function() { const materia = document.getElementById('select-materia-flashcard').value; const frente = document.getElementById('flashcard-frente').value.trim(); const verso = document.getElementById('flashcard-verso').value.trim(); if(!materia) return alert("Selecione uma matéria!"); if(!frente || !verso) return alert("Preencha a frente e o verso."); window.dadosEstudo.flashcards.push({ id: Date.now(), materia, frente, verso }); document.getElementById('flashcard-frente').value = ''; document.getElementById('flashcard-verso').value = ''; window.salvarLocal(false); window.renderizarFlashcards(); alert("Cartão Salvo!"); };
window.deletarFlashcard = function(id) { if(confirm("Excluir este cartão?")) { window.dadosEstudo.flashcards = window.dadosEstudo.flashcards.filter(f => f.id !== id); window.salvarLocal(false); window.renderizarFlashcards(); } };
window.alternarFlashcardLista = function(id) { document.getElementById(`fc-verso-${id}`).classList.toggle('hidden'); };
window.salvarResumo = function() { const materia = document.getElementById('select-materia-resumo').value; const titulo = document.getElementById('resumo-titulo').value.trim(); const conteudo = document.getElementById('resumo-conteudo').value.trim(); if(!materia) return alert("Selecione uma matéria!"); if(!titulo || !conteudo) return alert("Preencha título e conteúdo."); const data = new Date().toLocaleDateString('pt-BR'); window.dadosEstudo.resumos.push({ id: Date.now(), materia, titulo, conteudo, data }); document.getElementById('resumo-titulo').value = ''; document.getElementById('resumo-conteudo').value = ''; window.salvarLocal(false); window.renderizarResumos(); alert("Resumo Salvo!"); };
window.deletarResumo = function(id) { if(confirm("Excluir este caderno/resumo?")) { window.dadosEstudo.resumos = window.dadosEstudo.resumos.filter(r => r.id !== id); window.salvarLocal(false); window.renderizarResumos(); } };
window.alternarResumo = function(id) { document.getElementById(`cont-resumo-${id}`).classList.toggle('hidden'); };