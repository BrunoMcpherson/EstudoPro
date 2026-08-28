# 🎓 EstudoPro

> Uma plataforma completa (SaaS) de gestão de estudos, produtividade e análise de desempenho, focada em estudantes e concurseiros de alto rendimento.

![Status](https://img.shields.io/badge/Status-Conclu%C3%ADdo-brightgreen)
![Versão](https://img.shields.io/badge/Vers%C3%A3o-1.0%20Nuvem-blue)
![Firebase](https://img.shields.io/badge/Firebase-Database%20%26%20Auth-orange)

## 💻 Sobre o Projeto
O **EstudoPro** nasceu da necessidade de unificar diversas ferramentas de estudos em um único lugar. O projeto evoluiu de um simples controlador de tempo local para uma aplicação web em nuvem completa, contando com autenticação de usuários, sincronização de dados em tempo real e arquitetura modular.

A aplicação permite que o usuário gerencie editais, acompanhe sua ofensiva de estudos, controle materiais (PDFs), contabilize horas via Pomodoro/Cronômetro e tenha uma visão clara do seu desempenho através de painéis gráficos inteligentes.

## ✨ Principais Funcionalidades

- **🔒 Autenticação em Nuvem:** Sistema de Login e Cadastro (E-mail/Senha) utilizando Firebase Auth, com proteção e isolamento de dados por usuário.
- **⏱️ Gestão de Tempo Dupla:** Temporizador Pomodoro configurável e Cronômetro Livre. Os tempos são convertidos e atrelados automaticamente à matéria estudada.
- **📊 Dashboard e Gráficos:** Integração com `Chart.js` para visualização de desempenho global, aproveitamento por matéria e evolução diária (Últimos 7 dias).
- **📅 Calendário Heatmap:** Mapeamento visual de constância diária (estilo "Commits do GitHub") que registra tempo, questões e páginas lidas por dia.
- **🔥 Sistema de Ofensiva (Streak):** Gamificação inteligente que contabiliza dias seguidos de estudo e "zera" automaticamente em caso de falhas.
- **📚 Controle de Edital e PDFs:** Inserção de edital em massa (separação automática por vírgulas ou quebras de linha), controle de tópicos revisados e gerenciador de leitura de PDFs com barra de progresso.
- **🧠 Revisões Espaçadas Automáticas:** Geração automática de revisões (Ex: 1, 7, 30 dias) ao concluir um tópico, com dias customizáveis pelo usuário.
- **💾 Backup Híbrido:** Sincronização automática via Firebase Firestore, além da opção de importar/exportar um backup físico `.json`.

## 🛠️ Tecnologias Utilizadas

- **Front-end:** HTML5, CSS3, JavaScript (ES6+ Modular)
- **Estilização:** Tailwind CSS (Via CDN) e FontAwesome (Ícones)
- **Visualização de Dados:** Chart.js
- **Back-end / BaaS:** Google Firebase (Authentication & Cloud Firestore)
- **Hospedagem:** GitHub Pages

## 🚀 Como Executar o Projeto

**1. Acesso Online:**
Você pode testar a aplicação diretamente pelo navegador acessando o link do GitHub Pages:
[🌐 Acessar EstudoPro](https://brunomcpherson.github.io/EstudoPro/) *(Substitua pelo seu link real)*

**2. Rodando Localmente:**
1. Clone este repositório:
   ```bash
   git clone [https://github.com/BrunoMcpherson/EstudoPro](https://github.com/BrunoMcpherson/EstudoPro)