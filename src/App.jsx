import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider } from './context/DataContext'; // Importamos o cérebro
import Login from './components/Login';
import Layout from './components/Layout';

function ControleRotas() {
  const { currentUser } = useAuth();
  if (!currentUser) return <Login />;
  return <Layout />;
}

export default function App() {
  return (
    <AuthProvider>
      {/* Colocamos o Provedor de Dados DENTRO da Autenticação */}
      <DataProvider>
        <ControleRotas />
      </DataProvider>
    </AuthProvider>
  );
}