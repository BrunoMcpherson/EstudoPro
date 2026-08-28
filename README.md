# 🎯 EstudoPro (v2.0)

O **EstudoPro** é uma plataforma Web (SaaS) completa e responsiva desenvolvida para otimizar a preparação de estudantes e concurseiros. Ele centraliza a gestão de tempo, controle de editais, métricas de desempenho, agendamento de revisões espaçadas e, agora, a criação de materiais de estudo ativos.

## 🚀 O que há de novo na Versão 2.0?

A versão 2.0 transforma o EstudoPro em um verdadeiro "caderno inteligente", focado em usabilidade (UX) e estabilidade de longo prazo:

* 🌗 **Modo Noturno Nativo:** Alternância suave entre temas Claro e Escuro, salvando a preferência do usuário na nuvem para evitar fadiga visual.
* 🧠 **Área "Meus Materiais":** Nova interface (Single Page Application) dedicada à criação de materiais de revisão.
* 📇 **Flashcards 3D:** Criação de cartões de pergunta/resposta com animação de giro tridimensional (Flip).
* 📓 **Resumos Estruturados:** Editor de cadernos virtuais para salvar anotações atreladas diretamente às matérias do edital.
* 📱 **Layouts Dinâmicos (Grid/Lista):** Alternância de visualização dos materiais entre grade e lista compacta (salvo na nuvem).
* ⏱️ **Timer Imparável (Anti-Throttling):** Cronômetro e Pomodoro reescritos com base em `Date.now()`, tornando-os imunes ao congelamento de abas inativas de navegadores (Chrome/Edge).
* ⏳ **Registro Manual de Tempo:** Inserção de horas estudadas fora do aplicativo.
* 🗑️ **Exclusão Granular:** Agora é possível excluir tópicos individuais do edital, sem precisar apagar a matéria inteira.
* 📊 **Gráficos e UX Aprimorados:** Títulos dinâmicos, correção de truncamento de texto, legendas personalizadas no *hover* (Chart.js) e Pop-ups (Tooltips) explicativos nos botões.
* ⚙️ **Revisões Customizáveis:** Novo *toggle* para ligar ou desligar o agendamento automático de revisões ao concluir um tópico.

---

## 🛠️ Funcionalidades Principais

### 1. Gestão de Tempo e Foco
* **Pomodoro Customizável:** Configure o tempo de foco e pausa.
* **Cronômetro Livre:** Para medir sessões contínuas.
* **Sistema de Ofensiva (Streak):** Monitora dias consecutivos de estudo.

### 2. Controle de Edital e Materiais
* **Edital em Massa:** Adicione matérias e subtópicos separados por vírgula.
* **Acompanhamento de PDFs:** Salve links, páginas lidas e calcule a porcentagem de avanço no material.
* **Progresso Visual:** Barra de progresso para cada matéria do edital.

### 3. Revisões e Desempenho
* **Agendamento Automático:** Define revisões espaçadas (ex: 1d, 7d, 30d) automaticamente ao concluir um tópico.
* **Controle de Questões:** Registre acertos e erros vinculados a cada matéria específica.
* **Dashboards Visuais:** Gráficos de evolução semanal (linha), aproveitamento (pizza) e tempo dedicado por matéria (barras).

### 4. Nuvem e Segurança
* **Autenticação:** Login e Cadastro seguros gerenciados pelo Firebase Auth.
* **Banco de Dados em Tempo Real:** Dados protegidos por regras estritas (Security Rules) no Firebase Firestore, garantindo que o usuário só acesse seus próprios dados.

---

## 💻 Tecnologias Utilizadas

O projeto foi construído com foco em leveza, performance e design moderno, sem a necessidade de frameworks pesados no front-end:

* **HTML5 e CSS3**
* **JavaScript (Vanilla / ES6 Modules)**
* **Tailwind CSS:** Para estilização responsiva, componentização visual rápida e Modo Noturno.
* **Chart.js:** Renderização de gráficos interativos.
* **Firebase (Google):** 
  * *Authentication* (Gestão de Identidade).
  * *Firestore* (Banco de Dados NoSQL escalável).
* **GitHub Pages:** Para hospedagem e CI/CD direto do repositório.

---

## ⚙️ Como executar o projeto localmente

Como o projeto utiliza ES6 Modules para se comunicar com o SDK do Firebase, ele precisa rodar através de um servidor local.

1. Clone este repositório no seu computador:
```bash
git clone [https://github.com/BrunoMcpherson/EstudoPro.git](https://github.com/BrunoMcpherson/EstudoPro.git)