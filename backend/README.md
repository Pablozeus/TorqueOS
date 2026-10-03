# AUTOMEVO — API Backend

API REST multi-tenant (Node.js + Express + PostgreSQL + Prisma) para o sistema
de gestao de oficinas mecanicas. Cada oficina e um tenant isolado: todo dado
de negocio carrega `oficinaId` e toda query dos controllers filtra por
`req.user.oficinaId`, que vem do token JWT — nunca do corpo da requisicao.

## Como rodar localmente

1. **Instalar dependencias**
   ```bash
   npm install
   ```

2. **Configurar variaveis de ambiente**
   ```bash
   cp .env.example .env
   ```
   Preencha `DATABASE_URL` com a string de conexao do seu PostgreSQL (local,
   Railway, Supabase, RDS, etc.) e defina `JWT_SECRET` / `JWT_REFRESH_SECRET`
   com valores aleatorios e longos.

3. **Criar as tabelas no banco**
   ```bash
   npm run prisma:migrate
   ```

4. **Popular dados iniciais** (planos, administrador master e uma oficina de
   demonstracao com os mesmos dados do protótipo de frontend)
   ```bash
   npm run seed
   ```
   Login de demonstracao criado pelo seed: `guilherme@automevo.com` / `123456`
   Login do painel master: o e-mail/senha definidos em `MASTER_ADMIN_EMAIL` /
   `MASTER_ADMIN_PASSWORD` no `.env`.

5. **Subir o servidor**
   ```bash
   npm run dev
   ```
   A API sobe em `http://localhost:3333`. Teste com `GET /health`.

## Estrutura

```
prisma/
  schema.prisma      modelo de dados completo (multi-tenant)
  seed.js             planos + super admin + oficina de demonstracao
src/
  app.js              montagem do Express (middlewares + rotas)
  server.js            ponto de entrada (listen)
  lib/prisma.js        instancia unica do Prisma Client
  utils/                jwt.js, password.js
  middleware/           authenticate, authorize, authenticateSuperAdmin,
                         rateLimiter, errorHandler, auditLog
  controllers/          um arquivo por dominio (auth, clientes, veiculos,
                         ordens, orcamentos, estoque, financeiro, dashboard,
                         master)
  routes/                idem, mapeando os endpoints HTTP
```

## Autenticacao

- `POST /api/auth/signup` — cria a oficina (tenant) + usuario ADMIN + inicia
  teste gratis de 7 dias. Retorna `accessToken` e `refreshToken`.
- `POST /api/auth/login` — retorna os mesmos tokens.
- `POST /api/auth/refresh` — troca um `refreshToken` valido por um novo
  `accessToken`.
- `GET /api/auth/me` — dados do usuario logado (rota protegida).
- `POST /api/auth/forgot-password` — recebe `{ email }`, gera um codigo de
  6 digitos (valido por 15 min), guarda so o hash dele no banco e envia por
  e-mail via Resend. Sempre responde com sucesso, mesmo se o e-mail nao
  existir, para nao revelar quais contas estao cadastradas.
- `POST /api/auth/reset-password` — recebe `{ email, codigo, novaSenha }`,
  confere o codigo e troca a senha.

### Configurando o envio de e-mail (Resend)

1. Crie uma conta gratis em https://resend.com
2. Gere uma API key e coloque em `RESEND_API_KEY` no `.env`
3. Defina `EMAIL_FROM` (em desenvolvimento pode usar o dominio de teste do
   proprio Resend, `onboarding@resend.dev`; em producao, verifique seu
   proprio dominio no painel do Resend)

Se `RESEND_API_KEY` nao estiver configurada, o codigo de recuperacao e
apenas impresso no console do servidor — assim da pra testar o fluxo
completo (`forgot-password` → pegar o codigo no terminal → `reset-password`)
sem precisar de conta no Resend ainda.

### Configurando a cobrança por boleto (Asaas)

1. Crie uma conta gratis em https://www.asaas.com (o cadastro já vem em
   modo sandbox, ideal para testar sem gerar cobrança real)
2. No painel, gere uma API key (`Integrações > API` ou similar) e coloque
   em `ASAAS_API_KEY` no `.env`. Deixe `ASAAS_ENV="sandbox"` enquanto
   estiver testando; troque para `"production"` só quando for cobrar de
   verdade (com uma API key de produção, que é diferente da de sandbox).
3. Configure o webhook: no painel do Asaas, em `Configurações > Webhooks`,
   cadastre a URL `https://SEU-DOMINIO/api/webhooks/asaas` e defina um
   token de autenticação — cole esse mesmo token em `ASAAS_WEBHOOK_TOKEN`
   no `.env`. Isso é o que garante que só o Asaas consegue notificar seu
   sistema sobre pagamentos.
4. Marque os eventos: `PAYMENT_RECEIVED`, `PAYMENT_CONFIRMED`,
   `PAYMENT_OVERDUE`, `SUBSCRIPTION_DELETED`.

Se `ASAAS_API_KEY` não estiver configurada, o sistema entra em **modo
simulado**: a assinatura é criada só no seu banco (com um id falso), sem
chamar o Asaas de verdade — assim dá pra testar a tela de assinar/cancelar
sem precisar de conta lá ainda. As mensagens `[asaas:simulado]` aparecem no
console do servidor nesse modo.

> **Importante**: mesmo com a chave de sandbox configurada, nenhuma
> cobrança real é gerada — o Asaas isola completamente o ambiente de teste
> do de produção (contas, clientes e assinaturas de sandbox não existem em
> produção e vice-versa). Teste à vontade antes de trocar para produção.

### Configurando o WhatsApp (Z-API)

O sistema manda mensagem de WhatsApp automaticamente em dois momentos, e
tem um botão manual para um terceiro:

- **Orçamento criado** → resumo do orçamento pro cliente
- **OS muda para "Pronto" (`FINALIZADA`)** → aviso de que o veículo está
  pronto para retirada
- **Botão "Cobrar" em Contas a Receber** (tela Financeiro) → lembrete de
  pagamento em aberto

Passo a passo:

1. Crie uma conta em https://www.z-api.io
2. Crie uma "instância" e conecte um número de WhatsApp escaneando o QR
   Code (use um número dedicado, não o seu pessoal, se puder)
3. Copie o `Instance ID` e o `Token` da instância e cole em
   `ZAPI_INSTANCE_ID` e `ZAPI_TOKEN` no `.env`
4. (Recomendado) Ative o "Client-Token" de segurança da conta, em
   `Segurança da conta` no painel, e cole em `ZAPI_CLIENT_TOKEN`

> **Sobre o risco de bloqueio**: por não ser a API oficial do WhatsApp, a
> Z-API (como qualquer solução desse tipo) tem um risco pequeno mas real de
> o número ser bloqueado pelo WhatsApp, principalmente com alto volume de
> mensagens em pouco tempo. Para uma operação pequena/média isso raramente
> é problema, mas vale saber que existe. Se um dia isso virar preocupação,
> a migração para a API oficial da Meta é o caminho — o serviço
> `src/services/whatsapp.js` foi escrito isolado dos controllers
> justamente para essa troca ser tranquila no futuro.

Se `ZAPI_INSTANCE_ID`/`ZAPI_TOKEN` não estiverem configurados, as mensagens
só são impressas no console do servidor (`[whatsapp:simulado]`) — dá pra
testar os gatilhos sem número conectado ainda. Falha ao enviar WhatsApp
nunca impede a ação principal (criar orçamento, mudar status da OS) —
fica só registrada.

Todas as rotas de negocio exigem o header:
```
Authorization: Bearer <accessToken>
```

## Principais endpoints

| Recurso | Rotas |
|---|---|
| Clientes | `GET/POST /api/clientes`, `GET/PUT/DELETE /api/clientes/:id` |
| Veiculos | `GET/POST /api/veiculos`, `GET/PUT/DELETE /api/veiculos/:id` |
| Ordens de Servico | `GET/POST /api/ordens`, `GET /api/ordens/:id`, `PATCH /api/ordens/:id/status`, `DELETE /api/ordens/:id` |
| Orcamentos | `GET/POST /api/orcamentos`, `PUT /api/orcamentos/:id`, `PATCH /api/orcamentos/:id/status`, `POST /api/orcamentos/:id/converter`, `DELETE /api/orcamentos/:id` |
| Estoque | `GET/POST /api/estoque`, `PUT/DELETE /api/estoque/:id`, `POST /api/estoque/:id/movimentacao` |
| Financeiro | `GET/POST /api/financeiro/receber`, `PATCH .../pagar`, `POST /api/financeiro/receber/:id/cobrar` (WhatsApp), `GET/POST /api/financeiro/pagar` (com `tipo`: `FIXA` ou `VARIAVEL`), `PATCH .../pagar`, `GET /api/financeiro/indicadores`, `GET /api/financeiro/relatorio-anual?ano=2026` |
| Dashboard | `GET /api/dashboard`, `GET /api/dashboard/faturamento-mensal` |
| Equipe | `GET/POST /api/usuarios`, `PATCH /api/usuarios/:id` (ativar/desativar, trocar perfil) |
| Assinatura | `GET /api/assinatura`, `POST /api/assinatura/assinar`, `POST /api/assinatura/cancelar` (restritas ao perfil ADMIN) |
| Webhook | `POST /api/webhooks/asaas` (rota pública, chamada pelo Asaas — validada por token) |
| Painel Master | `POST /api/master/login`, `GET /api/master/oficinas`, `PATCH /api/master/oficinas/:id/status`, `GET /api/master/metricas`, `GET /api/master/planos` |

## Regras de negocio ja implementadas

- **Relatório Anual (Financeiro)**: agrega, mês a mês de um ano inteiro,
  faturamento (soma dos itens das OS abertas naquele mês), receita (contas
  a receber pagas), custos fixos e variáveis (contas a pagar pagas, por
  `tipo`), dívidas em aberto (contas a pagar pendentes por vencimento),
  lucro, ticket médio por carro (faturamento ÷ número de OS) e margem de
  lucro (%). Tudo calculado on-the-fly a partir dos dados reais — nada é
  digitado manualmente.
- **Isolamento multi-tenant**: nenhuma query aceita `oficinaId` do cliente;
  ele sempre vem do JWT.
- **Criar OS com itens do tipo peca** da baixa automatica no estoque e
  registra a movimentacao, tudo em uma transacao atomica.
- **Converter orcamento aprovado em OS** copia os itens e marca o orcamento
  como `CONVERTIDO`.
- **Alerta de estoque baixo**: `GET /api/estoque?baixoEstoque=true`.
- **Auditoria**: acoes sensiveis (login, criar OS, mudar status, converter
  orcamento) sao registradas em `audit_logs`.
- **Seguranca**: senha com bcrypt, JWT de acesso curto (15 min) + refresh
  token (7 dias), rate limit dedicado nas rotas de autenticacao, Helmet e
  CORS restrito por variavel de ambiente.
- **Status de OS**: `ABERTA`, `EM_ANDAMENTO`, `AGUARDANDO_PECAS`,
  `AGUARDANDO_APROVACAO`, `FINALIZADA`, `ENTREGUE`, `CANCELADA`,
  `DESISTENCIA`.
- **Controle de acesso por perfil (`authorize`)**: `ADMIN`, `GERENTE` e
  `ATENDENTE` têm acesso total (clientes, veículos, orçamentos, estoque,
  financeiro, equipe, dashboard). O perfil `MECANICO` só enxerga a rota de
  Ordens de Serviço, e mesmo ali só vê e só pode mudar o status das OS que
  estão atribuídas a ele mesmo (`mecanicoId`) — o filtro acontece na
  consulta ao banco, não é só escondido na tela. Um mecânico não consegue
  criar/excluir OS, nem acessar clientes, financeiro ou a lista de equipe.
- **Cargo x Perfil**: são dois campos separados no `Usuario`. `perfil` é o
  nível de acesso técnico (as 4 opções acima, fixas). `cargo` é texto livre
  para a função real da pessoa — Pintor, Funileiro, Ajudante, Mecânico
  Preparador, ou qualquer outra que a oficina use — sem precisar mexer no
  código para adicionar uma nova.

> **Atenção**: os dois últimos status (`CANCELADA`, `DESISTENCIA`) foram
> adicionados depois da primeira migration. Se seu banco já existia antes
> dessa mudança, rode `npx prisma migrate dev --name add_status_os` de
> novo para atualizar o enum no banco.

## O que falta plugar (integracoes externas)

Os pontos de extensao ja existem no schema (`Assinatura`, `ProvedorPagamento`)
e no `.env.example`, mas as chamadas reais para APIs externas nao foram
implementadas porque exigem credenciais proprias de cada servico:

- **Stripe / Mercado Pago / Asaas** — cobranca recorrente e webhooks de
  pagamento (cancelamento automatico por inadimplencia).
- **WhatsApp Business API** — envio de orcamento, aviso de veiculo pronto e
  cobranca.
- **IA** (sugestao de manutencao futura, geracao de orcamento, analise
  financeira) — endpoint dedicado consumindo a API da Anthropic.

Cada uma dessas integracoes pode ser adicionada como um novo service em
`src/services/`, mantendo os controllers como estao.
