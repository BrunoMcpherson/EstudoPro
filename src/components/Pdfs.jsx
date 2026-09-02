import React, { useState } from 'react';
import { useData } from '../context/DataContext';

// 1. Sub-componente para gerenciar cada PDF individualmente
function PdfItem({ pdf, onUpdateLidas, onDeletar, onAbrirLeitor }) {
  const [inicio, setInicio] = useState('');
  const [fim, setFim] = useState('');

  const pct = pdf.totalPaginas > 0 ? Math.round((pdf.lidas / pdf.totalPaginas) * 100) : 0;

  function handleSalvarLeitura() {
    const i = parseInt(inicio);
    const f = parseInt(fim);
    if (!isNaN(i) && !isNaN(f) && f >= i) {
      const qtd = (f - i) + 1;
      onUpdateLidas(pdf.id, qtd, f);
      setInicio('');
      setFim('');
    } else {
      alert("Intervalo de páginas inválido.");
    }
  }

  return (
    <div className="border dark:border-gray-700 rounded-xl p-4 bg-gray-50 dark:bg-gray-700 shadow-sm border-l-4 border-red-500">
      <div className="flex justify-between items-start mb-2 gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex flex-col xl:flex-row xl:items-center gap-1 xl:gap-2 mb-1">
            <span className="text-[10px] font-black text-white bg-red-500 px-2 py-1 rounded uppercase tracking-widest shadow-sm inline-block w-max">
              {pdf.materia}
            </span>
            <p className="font-black text-gray-800 dark:text-white text-sm md:text-base truncate leading-tight">
              {pdf.nome}
            </p>
          </div>
          <div className="mt-2">
            {pdf.link ? (
              <button onClick={() => onAbrirLeitor(pdf.link)} className="text-white bg-blue-500 hover:bg-blue-600 px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm transition">
                <i className="fa-solid fa-cloud mr-1"></i> Abrir Leitor
              </button>
            ) : (
              <span className="text-[10px] bg-gray-200 dark:bg-gray-600 text-gray-500 dark:text-gray-300 px-2 py-1 rounded font-bold uppercase">
                Arquivo Local
              </span>
            )}
          </div>
        </div>
        <button onClick={() => onDeletar(pdf.id)} className="text-gray-400 hover:text-red-500 transition shrink-0 p-2">
          <i className="fa-solid fa-trash"></i>
        </button>
      </div>

      <div className="flex justify-between text-[10px] md:text-xs text-gray-500 dark:text-gray-400 mb-1 font-black uppercase tracking-wider mt-4">
        <span>Lidas: {pdf.lidas}/{pdf.totalPaginas}</span>
        <span>Atual: {pdf.ultimaPagina}</span>
      </div>

      <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2 mb-3">
        <div className="bg-red-500 h-2 rounded-full transition-all duration-500" style={{ width: `${pct}%` }}></div>
      </div>

      <div className="flex items-center gap-2 text-sm">
        <input type="number" placeholder="Início" value={inicio} onChange={e => setInicio(e.target.value)} className="border dark:border-gray-500 dark:bg-gray-800 dark:text-white p-2 w-16 md:w-20 rounded-lg text-center font-bold outline-none focus:ring-2 focus:ring-red-400" />
        <span className="dark:text-gray-400 font-bold">à</span>
        <input type="number" placeholder="Fim" value={fim} onChange={e => setFim(e.target.value)} className="border dark:border-gray-500 dark:bg-gray-800 dark:text-white p-2 w-16 md:w-20 rounded-lg text-center font-bold outline-none focus:ring-2 focus:ring-red-400" />
        <button onClick={handleSalvarLeitura} className="bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 px-3 py-2 rounded-lg font-black hover:bg-green-200 flex-1 transition shadow-sm">
          + Lidas
        </button>
      </div>
    </div>
  );
}

// 2. Componente Principal
export default function Pdfs() {
  const { dadosEstudo, salvarDados } = useData();
  
  // Estados do formulário
  const [materia, setMateria] = useState('');
  const [nome, setNome] = useState('');
  const [link, setLink] = useState('');
  const [totalPaginas, setTotalPaginas] = useState('');

  // Estado do Leitor de PDF
  const [pdfAtivo, setPdfAtivo] = useState(null);

  const pdfs = dadosEstudo.pdfs || [];
  const materias = dadosEstudo.materias || [];

  async function handleSalvarPdf(e) {
    e.preventDefault();
    if (!materia) return alert("Selecione a matéria!");
    if (!nome || !totalPaginas) return alert("Preencha nome e o total de páginas!");

    const novoPdf = {
      id: Date.now(),
      materia,
      nome,
      link,
      totalPaginas: parseInt(totalPaginas),
      lidas: 0,
      ultimaPagina: 0
    };

    await salvarDados({ ...dadosEstudo, pdfs: [...pdfs, novoPdf] });
    setNome(''); setLink(''); setTotalPaginas('');
  }

  async function handleDeletarPdf(id) {
    if (!window.confirm("Excluir este PDF?")) return;
    const novaLista = pdfs.filter(p => p.id !== id);
    await salvarDados({ ...dadosEstudo, pdfs: novaLista });
  }

  async function handleUpdateLidas(id, qtdAdicionada, novaUltimaPagina) {
    const novaLista = JSON.parse(JSON.stringify(pdfs));
    const pdf = novaLista.find(p => p.id === id);
    
    if (pdf) {
      pdf.lidas += qtdAdicionada;
      if (pdf.lidas > pdf.totalPaginas) pdf.lidas = pdf.totalPaginas; // Trava o máximo
      pdf.ultimaPagina = novaUltimaPagina;

      // Atualiza também o total de páginas lidas no Dashboard geral!
      const paginasGlobais = (dadosEstudo.paginasLidas || 0) + qtdAdicionada;

      await salvarDados({ ...dadosEstudo, pdfs: novaLista, paginasLidas: paginasGlobais });
    }
  }

  function abrirPdfLocal(e) {
    const file = e.target.files[0];
    if (file && file.type === "application/pdf") {
      const fileURL = URL.createObjectURL(file);
      setPdfAtivo(fileURL);
    } else {
      alert("Selecione um arquivo PDF válido.");
    }
  }

  return (
    <div className="flex flex-col h-full animate-fade-in w-full">
      
      {/* Topo: Formulário */}
      <div className="bg-white dark:bg-gray-800 p-4 md:p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 mb-6 shrink-0">
        <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">
          <i className="fa-solid fa-file-pdf text-red-500 mr-2"></i> Gerenciador de PDFs
        </h2>
        
        <div className="flex flex-col md:flex-row gap-4">
          {/* Cadastro Web */}
          <form onSubmit={handleSalvarPdf} className="bg-gray-50 dark:bg-gray-700 p-4 rounded-xl border dark:border-gray-600 flex-1">
            <p className="text-sm font-bold text-gray-600 dark:text-gray-300 mb-3">Cadastrar PDF / Drive</p>
            
            <div className="flex flex-col gap-3 mb-3">
              <select value={materia} onChange={e => setMateria(e.target.value)} required className="w-full p-2 border rounded-lg bg-white dark:bg-gray-800 dark:text-white font-bold outline-none">
                <option value="">Selecione a matéria...</option>
                {materias.map((m, i) => <option key={i} value={m.nome}>{m.nome}</option>)}
              </select>
              
              <div className="flex flex-col sm:flex-row gap-2">
                <input type="text" placeholder="Assunto (Ex: Inquérito)" value={nome} onChange={e => setNome(e.target.value)} required className="w-full sm:flex-1 p-2 border rounded-lg bg-white dark:bg-gray-800 dark:text-white outline-none" />
                <input type="number" placeholder="Págs Totais" value={totalPaginas} onChange={e => setTotalPaginas(e.target.value)} required className="w-full sm:w-32 p-2 border rounded-lg bg-white dark:bg-gray-800 dark:text-white outline-none" />
              </div>
              
              <input type="url" placeholder="Link web ou Google Drive (Opcional)" value={link} onChange={e => setLink(e.target.value)} className="w-full p-2 border rounded-lg bg-white dark:bg-gray-800 dark:text-white outline-none" />
            </div>
            <button type="submit" className="w-full bg-red-500 text-white py-2.5 rounded-lg font-bold hover:bg-red-600 transition shadow">
              Salvar na Lista
            </button>
          </form>

          {/* Leitor Rápido de PC */}
          <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-xl border border-indigo-100 dark:border-indigo-800 flex-1 flex flex-col justify-center items-center text-center">
            <i className="fa-solid fa-book-open-reader text-3xl text-indigo-500 mb-2"></i>
            <p className="text-sm font-bold text-indigo-800 dark:text-indigo-300 mb-1">Leitor Interno Instantâneo</p>
            <p className="text-xs text-indigo-600 dark:text-indigo-400 mb-4 px-4">Abra um PDF que já está baixado no seu computador.</p>
            
            <input type="file" id="pdf-file-input" accept="application/pdf" className="hidden" onChange={abrirPdfLocal} />
            <button type="button" onClick={() => document.getElementById('pdf-file-input').click()} className="bg-indigo-600 text-white px-6 py-2.5 rounded-lg font-bold hover:bg-indigo-700 transition shadow-md w-full max-w-[250px]">
              Selecionar Arquivo
            </button>
          </div>
        </div>
      </div>

      {/* Metade Inferior: Lista vs Leitor */}
      <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-[500px]">
        
        {/* Lista de PDFs Cadastrados */}
        <div className="w-full lg:w-1/3 bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col">
          <h3 className="font-bold text-gray-700 dark:text-gray-300 mb-4 border-b dark:border-gray-700 pb-2">
            Meus PDFs Cadastrados
          </h3>
          <div className="space-y-4 overflow-y-auto scroll-custom pr-2 flex-1">
            {pdfs.length === 0 ? (
              <p className="text-sm text-gray-400 text-center mt-4">Nenhum PDF cadastrado.</p>
            ) : (
              pdfs.map(pdf => (
                <PdfItem 
                  key={pdf.id} 
                  pdf={pdf} 
                  onUpdateLidas={handleUpdateLidas} 
                  onDeletar={handleDeletarPdf} 
                  onAbrirLeitor={setPdfAtivo}
                />
              ))
            )}
          </div>
        </div>

        {/* Leitor de PDF (Iframe) */}
        <div className="w-full lg:w-2/3 bg-gray-200 dark:bg-gray-800 rounded-2xl border dark:border-gray-700 flex-col overflow-hidden relative shadow-inner">
          {!pdfAtivo ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 p-8 text-center">
              <i className="fa-solid fa-file-pdf text-6xl mb-4 opacity-50"></i>
              <p className="font-bold text-lg">O Leitor está vazio</p>
              <p className="text-sm mt-2">Clique em "Abrir Leitor" em algum PDF da sua lista ou selecione um arquivo do computador.</p>
            </div>
          ) : (
            <>
              <button 
                onClick={() => setPdfAtivo(null)} 
                className="absolute top-4 right-4 bg-red-500 text-white w-10 h-10 rounded-full shadow-lg z-20 hover:bg-red-600 transition flex items-center justify-center"
                title="Fechar Leitor"
              >
                <i className="fa-solid fa-xmark text-lg"></i>
              </button>
              <iframe src={pdfAtivo} className="w-full h-full border-0 absolute inset-0 z-10 bg-white" title="Leitor PDF"></iframe>
            </>
          )}
        </div>

      </div>
    </div>
  );
}