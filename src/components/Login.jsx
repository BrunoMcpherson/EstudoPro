import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [nome, setNome] = useState('');
  const [erro, setErro] = useState('');
  const { login, register } = useAuth();

  async function handleSubmit(e) {
    e.preventDefault();
    setErro('');
    try {
      if (isRegistering) {
        if (senha.length < 6) throw new Error('A senha deve ter no mínimo 6 caracteres.');
        await register(email, senha, { nome, email });
      } else {
        await login(email, senha);
      }
    } catch (error) {
      setErro(isRegistering ? 'Erro ao criar conta. Verifique os dados.' : 'E-mail ou senha incorretos.');
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 px-4 backdrop-blur-sm transition-all duration-300">
      <div className="bg-white dark:bg-gray-800 p-6 md:p-8 rounded-2xl shadow-2xl w-full max-w-md border dark:border-gray-700">
        <div className="text-center mb-6">
          <h1 className="text-4xl font-black text-indigo-600 dark:text-indigo-400 mb-2">
            <i className="fa-solid fa-cloud"></i> EstudoPro
          </h1>
          <p className="text-gray-500 dark:text-gray-400 font-semibold">
            {isRegistering ? 'Crie sua conta para salvar na nuvem' : 'Acesse sua conta'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegistering && (
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Nome Completo</label>
              <input type="text" required value={nome} onChange={(e) => setNome(e.target.value)} className="w-full p-3 border rounded-lg bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
          )}
          
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">E-mail</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full p-3 border rounded-lg bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Senha</label>
            <input type="password" required value={senha} onChange={(e) => setSenha(e.target.value)} className="w-full p-3 border rounded-lg bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>

          <button type="submit" className={`w-full text-white font-bold py-3 rounded-lg shadow-md transition mt-2 ${isRegistering ? 'bg-green-600 hover:bg-green-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
            {isRegistering ? 'Finalizar Cadastro' : 'Entrar'}
          </button>
        </form>

        {erro && <p className="text-center text-sm font-bold text-red-500 mt-4">{erro}</p>}

        <p className="text-center text-sm font-bold text-gray-500 dark:text-gray-400 mt-6 cursor-pointer hover:text-indigo-600 transition" onClick={() => setIsRegistering(!isRegistering)}>
          {isRegistering ? 'Já tem conta? Voltar ao Login.' : 'Não tem conta? Crie uma aqui.'}
        </p>
      </div>
    </div>
  );
}