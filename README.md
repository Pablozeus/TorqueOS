# 🚗 TorqueOS

### Plataforma SaaS para gestão inteligente de oficinas automotivas.

<p align="center">
  <strong>Organização, tecnologia e eficiência para o setor automotivo.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=white" />
  <img src="https://img.shields.io/badge/Node.js-Backend-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" />
  <img src="https://img.shields.io/badge/PostgreSQL-Database-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" />
  <img src="https://img.shields.io/badge/Prisma-ORM-2D3748?style=for-the-badge&logo=prisma&logoColor=white" />
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Status-Em%20desenvolvimento-blue" />
  <img src="https://img.shields.io/badge/Architecture-Multi--Tenant-purple" />
  <img src="https://img.shields.io/badge/Type-SaaS-orange" />
</p>

---

## 📌 Sobre o projeto

O **TorqueOS** é uma plataforma SaaS desenvolvida para digitalizar e otimizar a gestão de oficinas mecânicas e centros automotivos.

A aplicação centraliza os principais processos administrativos e operacionais de uma oficina em um único ambiente, permitindo gerenciar clientes, veículos, ordens de serviço, orçamentos, estoque, equipe e financeiro.

O projeto utiliza uma arquitetura separada entre frontend e backend, com API REST, banco de dados relacional e estrutura multi-tenant para isolamento dos dados de cada oficina.

O objetivo é transformar processos tradicionalmente manuais em operações digitais, organizadas e eficientes.

---

## ✨ Funcionalidades

### 📊 Dashboard
- Indicadores de desempenho da oficina.
- Acompanhamento do faturamento.
- Gráficos financeiros.
- Informações operacionais centralizadas.

### 👥 Gestão de clientes
- Cadastro de clientes.
- Informações de contato.
- Histórico relacionado aos serviços.

### 🚘 Gestão de veículos
- Cadastro de veículos.
- Identificação por placa.
- Marca, modelo, ano e quilometragem.
- Associação entre clientes e veículos.

### 🔧 Ordens de serviço
- Abertura de ordens de serviço.
- Associação com clientes e veículos.
- Descrição dos problemas identificados.
- Registro de serviços executados.
- Atribuição de responsáveis.
- Controle de status.
- Registro de peças e mão de obra.
- Registro de movimentações de estoque.

### 📝 Orçamentos
- Criação de orçamentos.
- Associação com clientes e veículos.
- Inclusão de peças e serviços.
- Controle de aprovação e reprovação.
- Conversão de orçamento aprovado em ordem de serviço.

### 📦 Controle de estoque
- Cadastro de peças.
- Controle de quantidades.
- Registro de entradas e saídas.
- Controle de estoque mínimo.
- Histórico de movimentações.

### 💰 Gestão financeira
- Contas a pagar.
- Contas a receber.
- Controle de despesas fixas e variáveis.
- Indicadores financeiros.
- Registro de pagamentos.
- Relatórios anuais.
- Cálculo de faturamento, custos, lucro e margem.

### 👨‍🔧 Gestão de equipe
- Cadastro de funcionários.
- Definição de cargos.
- Controle de permissões.
- Atribuição de mecânicos às ordens de serviço.

### 🔐 Autenticação e segurança
- Cadastro e login.
- Autenticação JWT.
- Access Token e Refresh Token.
- Recuperação de senha por e-mail.
- Criptografia de senhas com bcrypt.
- Controle de acesso baseado em perfis.
- Proteção de rotas.
- Registro de atividades importantes.

### 💳 Assinaturas SaaS
- Cadastro de oficinas como organizações independentes.
- Período de avaliação gratuita de 7 dias.
- Gerenciamento de planos.
- Criação e cancelamento de assinaturas.
- Integração com Asaas para cobranças recorrentes por boleto.
- Webhooks para notificações de pagamento.

### 📱 Integração com WhatsApp
- Envio de mensagens relacionadas aos orçamentos.
- Notificações de veículos prontos para retirada.
- Lembretes de cobrança.
- Integração com Z-API.

---

## 🏗️ Arquitetura do projeto

O sistema utiliza uma arquitetura cliente-servidor.

```text
                 TORQUEOS
                    |
          +---------+---------+
          |                   |
       FRONTEND             BACKEND
          |                   |
       React               Node.js
       Vite                Express
       Tailwind CSS        API REST
          |                   |
          |                Prisma ORM
          |                   |
          +-------------------+
                              |
                         PostgreSQL
                              |
                    +---------+---------+
                    |         |         |
                  Asaas    Resend     Z-API
```

### Multi-tenancy

Uma das características arquiteturais do projeto é o modelo multi-tenant.

Cada oficina possui seus próprios dados e usuários.

O isolamento é implementado utilizando o identificador `oficinaId`, associado aos registros de negócio e aplicado nas consultas do backend.

Isso permite que diferentes oficinas utilizem a mesma plataforma sem compartilhar seus dados operacionais.

---

## 🛠️ Tecnologias utilizadas

### Frontend

| Tecnologia | Finalidade |
|---|---|
| React 18 | Construção da interface |
| Vite | Ambiente de desenvolvimento e build |
| Tailwind CSS | Estilização |
| Recharts | Visualização de dados |
| Lucide React | Ícones |

### Backend

| Tecnologia | Finalidade |
|---|---|
| Node.js | Ambiente de execução |
| Express.js | API REST |
| Prisma ORM | Comunicação com banco de dados |
| PostgreSQL | Persistência de dados |
| JWT | Autenticação |
| bcryptjs | Hash de senhas |
| Zod | Validação |
| Helmet | Cabeçalhos de segurança |
| Express Rate Limit | Limitação de requisições |

### Integrações externas

| Serviço | Finalidade |
|---|---|
| Asaas | Cobranças e assinaturas |
| Resend | Envio de e-mails |
| Z-API | Mensagens pelo WhatsApp |

---

## 📂 Estrutura de pastas

```text
TorqueOS/
│
├── backend/
│   │
│   ├── prisma/
│   │   ├── migrations/
│   │   ├── schema.prisma
│   │   └── seed.js
│   │
│   ├── src/
│   │   ├── controllers/
│   │   │   ├── assinatura.controller.js
│   │   │   ├── auth.controller.js
│   │   │   ├── clientes.controller.js
│   │   │   ├── dashboard.controller.js
│   │   │   ├── estoque.controller.js
│   │   │   ├── financeiro.controller.js
│   │   │   ├── master.controller.js
│   │   │   ├── orcamentos.controller.js
│   │   │   ├── ordens.controller.js
│   │   │   ├── usuarios.controller.js
│   │   │   ├── veiculos.controller.js
│   │   │   └── webhooks.controller.js
│   │   │
│   │   ├── lib/
│   │   ├── middleware/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── utils/
│   │   ├── app.js
│   │   └── server.js
│   │
│   ├── .env.example
│   └── package.json
│
├── frontend/
│   │
│   ├── src/
│   │   ├── lib/
│   │   │   ├── api.js
│   │   │   └── mappers.js
│   │   │
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   │
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── .env.example
│   └── package.json
│
└── README.md
```

---

## ⚙️ Instalação e execução

### Pré-requisitos

- Node.js.
- npm.
- PostgreSQL.
- Git.

### 1. Clonar o repositório

```bash
git clone https://github.com/Pablozeus/TorqueOS.git

cd TorqueOS
```

### 2. Configurar o backend

```bash
cd backend

npm install
```

Criar o arquivo de ambiente:

```bash
cp .env.example .env
```

Configure as variáveis necessárias no arquivo `.env`.

Principalmente:

```env
DATABASE_URL="SUA_URL_POSTGRESQL"

JWT_SECRET="SEU_SEGREDO_JWT"
JWT_REFRESH_SECRET="SEU_SEGREDO_REFRESH"

PORT=3333
NODE_ENV="development"
```

Configure também as credenciais das integrações externas quando necessário.

### 3. Configurar o banco de dados

Execute as migrações:

```bash
npm run prisma:migrate
```

Para gerar os dados iniciais:

```bash
npm run seed
```

### 4. Iniciar o backend

```bash
npm run dev
```

Por padrão, a API estará disponível em:

```text
http://localhost:3333
```

Endpoint de verificação:

```text
GET /health
```

### 5. Configurar o frontend

Abra outro terminal:

```bash
cd frontend

npm install
```

Crie o arquivo `.env`:

```bash
cp .env.example .env
```

Configure:

```env
VITE_API_URL="http://localhost:3333/api"
```

### 6. Iniciar o frontend

```bash
npm run dev
```

O Vite disponibilizará a aplicação em:

```text
http://localhost:5173
```

---

## 🔑 Controle de acesso

O sistema possui diferentes níveis de acesso:

| Perfil | Permissões |
|---|---|
| ADMIN | Administração da oficina |
| GERENTE | Gestão operacional |
| ATENDENTE | Operações administrativas |
| MECANICO | Visualização e atualização das próprias OS |

O controle de permissões também é realizado no backend, evitando depender exclusivamente das restrições visuais da interface.

---

## 🔌 Principais módulos da API

| Endpoint | Responsabilidade |
|---|---|
| `/api/auth` | Autenticação |
| `/api/clientes` | Clientes |
| `/api/veiculos` | Veículos |
| `/api/ordens` | Ordens de serviço |
| `/api/orcamentos` | Orçamentos |
| `/api/estoque` | Estoque |
| `/api/financeiro` | Financeiro |
| `/api/dashboard` | Indicadores |
| `/api/usuarios` | Equipe |
| `/api/assinatura` | Assinaturas |
| `/api/master` | Administração da plataforma |
| `/api/webhooks` | Integrações externas |

---

## 📈 Regras de negócio e diferenciais técnicos

Algumas implementações importantes:

- Isolamento de dados por oficina.
- Autenticação com tokens de acesso e renovação.
- Controle de permissões por perfil.
- Baixa automática de peças no estoque durante operações de OS.
- Conversão de orçamentos aprovados em ordens de serviço.
- Criação automática de contas a receber a partir de ordens de serviço.
- Registro de auditoria de operações importantes.
- Relatórios financeiros calculados a partir dos registros do banco.
- Proteção contra excesso de requisições.
- Tratamento centralizado de erros.

---

## 🚧 Melhorias futuras

O projeto continua em evolução.

Entre os próximos aprimoramentos estão:

- Expansão das funcionalidades de edição e exclusão diretamente pela interface.
- Ampliação dos recursos de automação.
- Melhorias na experiência mobile.
- Novas ferramentas de análise financeira.
- Expansão das integrações externas.
- Evolução dos recursos administrativos da plataforma.

---

## 👨‍💻 Desenvolvedor

**Pablo Guilherme**

Desenvolvedor Full Stack, interessado na construção de sistemas, aplicações web e soluções tecnológicas para problemas reais.

GitHub: https://github.com/Pablozeus

Repositório: https://github.com/Pablozeus/TorqueOS

---

<p align="center">
  <strong>TorqueOS</strong>
  <br>
  Tecnologia impulsionando a gestão automotiva.
  <br><br>
  Desenvolvido por Pablo Guilherme 🚀
</p>
