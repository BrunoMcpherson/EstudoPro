import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login, signup, resetPassword } = useAuth();
  
  // Modos: 'login' | 'cadastro' | 'recuperar'
  const [modo, setModo] = useState('login');
  
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  
  const [erro, setErro] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [loading, setLoading] = useState(false);

  function alternarModo(novoModo) {
    setModo(novoModo);
    setErro('');
    setMensagem('');
  }

  function traduzirErroFirebase(error) {
    console.error("Detalhes do erro Firebase:", error.code, error.message);
    switch (error.code) {
      case 'auth/email-already-in-use':
        return 'Este e-mail já está cadastrado. Tente fazer login ou recuperar a senha.';
      case 'auth/weak-password':
        return 'A senha deve ter pelo menos 6 caracteres.';
      case 'auth/invalid-email':
        return 'O formato do e-mail digitado é inválido.';
      case 'auth/operation-not-allowed':
        return 'O cadastro por e-mail/senha está desativado no painel do Firebase.';
      case 'auth/user-not-found':
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        return 'E-mail ou senha incorretos.';
      case 'auth/too-many-requests':
        return 'Muitas tentativas seguidas. Aguarde alguns minutos e tente novamente.';
      default:
        return `Erro (${error.code || '400'}): Verifique os dados informados.`;
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErro('');
    setMensagem('');

    if (modo === 'cadastro' && senha.length < 6) {
      return setErro('A senha precisa ter no mínimo 6 caracteres.');
    }

    setLoading(true);
    try {
      if (modo === 'login') {
        await login(email, senha);
      } else if (modo === 'cadastro') {
        await signup(email, senha, nome);
      } else if (modo === 'recuperar') {
        await resetPassword(email);
        setMensagem('Enviamos um link de redefinição para o seu e-mail! Verifique também a caixa de Spam.');
      }
    } catch (error) {
      setErro(traduzirErroFirebase(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 text-white p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 w-full max-w-md shadow-2xl">
        
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center gap-2 text-indigo-400 text-3xl font-black mb-1">
            <i className="fa-solid fa-cloud"></i>
            <span>EstudoPro</span>
          </div>
          <p className="text-gray-400 text-sm">
            {modo === 'login' && 'Entre na sua conta para sincronizar seus estudos'}
            {modo === 'cadastro' && 'Crie sua conta para salvar na nuvem'}
            {modo === 'recuperar' && 'Informe seu e-mail para redefinir a sua senha'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {modo === 'cadastro' && (
            <div>
              <label className="block text-xs font-bold text-gray-300 mb-1">Nome Completo</label>
              <input
                type="text"
                required
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Seu nome"
                className="w-full p-3 rounded-lg bg-gray-800 border border-gray-700 text-white outline-none focus:border-indigo-500 transition"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-gray-300 mb-1">E-mail</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seuemail@exemplo.com"
              className="w-full p-3 rounded-lg bg-gray-800 border border-gray-700 text-white outline-none focus:border-indigo-500 transition"
            />
          </div>

          {modo !== 'recuperar' && (
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-bold text-gray-300">Senha</label>
                {modo === 'login' && (
                  <button
                    type="button"
                    onClick={() => alternarModo('recuperar')}
                    className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold transition"
                  >
                    Esqueceu a senha?
                  </button>
                )}
              </div>
              <input
                type="password"
                required
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="Mínimo de 6 caracteres"
                className="w-full p-3 rounded-lg bg-gray-800 border border-gray-700 text-white outline-none focus:border-indigo-500 transition"
              />
            </div>
          )}

          {erro && (
            <div className="p-3 rounded-lg bg-red-900/30 border border-red-800 text-red-400 text-xs font-bold text-center">
              {erro}
            </div>
          )}

          {mensagem && (
            <div className="p-3 rounded-lg bg-emerald-900/30 border border-emerald-800 text-emerald-400 text-xs font-bold text-center">
              {mensagem}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 rounded-lg font-black text-white transition shadow-lg ${
              modo === 'cadastro' 
                ? 'bg-emerald-600 hover:bg-emerald-500' 
                : 'bg-indigo-600 hover:bg-indigo-500'
            } disabled:opacity-50`}
          >
            {loading ? 'Aguarde...' : (
              modo === 'login' ? 'Entrar' : 
              modo === 'cadastro' ? 'Finalizar Cadastro' : 
              'Enviar Link de Recuperação'
            )}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-gray-400 space-y-2">
          {modo === 'login' && (
            <button onClick={() => alternarModo('cadastro')} className="hover:text-white transition font-semibold">
              Não tem conta? Crie uma agora.
            </button>
          )}
          {(modo === 'cadastro' || modo === 'recuperar') && (
            <button onClick={() => alternarModo('login')} className="hover:text-white transition font-semibold">
              Já tem conta? Voltar ao Login.
            </button>
          )}
        </div>

      </div>
    </div>
  );
}