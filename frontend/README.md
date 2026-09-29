# TorqueOS — Frontend

Projeto React (Vite + Tailwind CSS) com as telas do sistema: Landing Page,
Login/Cadastro/Recuperação de senha, Dashboard, Ordens de Serviço, Clientes,
Veículos, Orçamentos, Estoque e Financeiro. **Já conectado à API real** do
backend (pasta `backend/`) — não usa mais dados fixos em memória.

## Como rodar

1. **O backend precisa estar rodando primeiro** (veja o README da pasta
   `backend/`). Por padrão a API sobe em `http://localhost:3333`.

2. **Configurar a URL da API**
   ```bash
   cp .env.example .env
   ```
   Por padrão já aponta para `http://localhost:3333/api` (o backend local).
   Só precisa mudar se o backend rodar em outra porta/endereço.

3. **Instalar dependências**
   ```bash
   npm install
   ```

4. **Rodar em modo desenvolvimento**
   ```bash
   npm run dev
   ```
   Abre em `http://localhost:5173`.

5. **Criar sua conta**: na landing page, clique em "Teste grátis" e
   preencha o formulário de cadastro — isso já cria a oficina de verdade
   no banco de dados através do backend. Você também pode entrar com a
   conta de demonstração criada pelo `npm run seed` do backend:
   `guilherme@torqueos.com` / `123456`.

## O que já está conectado à API de verdade

- **Login, cadastro, "esqueci minha senha" e redefinir senha** — chamadas
  reais para `/api/auth/*`. A sessão fica salva no navegador (localStorage),
  então recarregar a página mantém você logado.
- **Clientes, Veículos, Ordens de Serviço, Orçamentos, Estoque** — listar e
  criar já usam a API real (`/api/clientes`, `/api/veiculos`, `/api/ordens`,
  `/api/orcamentos`, `/api/estoque`).
- **Orçamentos** — aprovar, reprovar e "Converter em Ordem de Serviço" já
  chamam a API de verdade.
- **Financeiro** — contas a pagar/receber, indicadores (receita, despesa,
  lucro) e "marcar como pago" vêm da API.
- **Cliente/veículo "livre"**: nos formulários de Veículo, Nova OS e Novo
  Orçamento, se você digitar um nome de cliente ou uma placa que ainda não
  existe, o sistema cria o registro automaticamente antes de salvar — não
  precisa cadastrar o cliente antes.
- **Equipe**: nova tela para cadastrar mecânicos, pintores, funileiros e
  atendentes. O campo "Responsável" da Nova OS agora é um seletor real
  puxando dessa equipe (com vínculo de verdade no banco, `mecanicoId`).
- **Faturamento do Dashboard**: o gráfico dos últimos 6 meses agora vem de
  `/api/dashboard/faturamento-mensal`, calculado a partir das Ordens de
  Serviço reais — não é mais um dado ilustrativo fixo.
- **Contas a receber automáticas**: toda OS criada com valor gera sozinha
  uma conta a receber no Financeiro (vencimento em 7 dias). Contas a pagar
  continuam manuais, mas agora dá pra lançá-las direto pela tela
  ("Nova Conta").
- **Login por perfil**: quem cadastra um membro da equipe como "Mecânico"
  vê, ao entrar, uma tela separada e simplificada — só as Ordens de Serviço
  atribuídas a ele, com um seletor de status. Sem acesso a clientes,
  financeiro, estoque ou à lista de equipe (bloqueado também no backend,
  não só escondido na tela).
- **Cargo real da pessoa**: o cadastro de equipe agora tem dois campos
  separados — "Cargo" (texto livre: Pintor, Funileiro, Ajudante, Mecânico
  Preparador, ou qualquer função que a oficina use) e "Nível de acesso"
  (acesso total ou restrito às próprias OS). Isso aparece no seletor de
  responsável da OS e na saudação de quem tem acesso restrito.
- **Assinatura** (visível só para o perfil Admin): tela para assinar um
  plano (gera cobrança recorrente por boleto via Asaas, enviado
  automaticamente por e-mail todo mês) ou cancelar a qualquer momento.
- **WhatsApp**: mensagem automática pro cliente quando um orçamento é
  criado e quando a OS muda para "Pronto". Na tela Financeiro, cada conta
  a receber pendente tem um botão verde de WhatsApp para mandar um
  lembrete de cobrança manual.
- **Relatório Anual**: nova tela no menu lateral com a visão mês a mês do
  ano inteiro (faturamento, receita, custos fixos/variáveis, dívidas,
  lucro, ticket médio por carro e margem de lucro), com seta para navegar
  entre anos. Ao lançar uma conta a pagar, agora dá pra marcar se é
  "Custo fixo" ou "Custo variável" — é essa categoria que alimenta as
  linhas de custos do relatório.

## Limitações conhecidas (próximos passos)

- **Excluir e editar** clientes/veículos/itens de estoque: a API já tem
  esses endpoints prontos (`PUT`/`DELETE`), mas as telas ainda só têm os
  botões de criar — editar/excluir pela interface fica para uma próxima
  etapa.

## Estrutura

```
index.html
src/
  main.jsx        ponto de entrada, monta o React na página
  App.jsx          todas as telas do sistema
  lib/
    api.js         cliente HTTP central (fetch + token + refresh automático)
    mappers.js      traduz o formato de dados da API pro formato das telas
  index.css        diretivas do Tailwind
tailwind.config.js
postcss.config.js
vite.config.js
```
