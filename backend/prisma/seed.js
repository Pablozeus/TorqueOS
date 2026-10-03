require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  console.log("Iniciando seed...");

  // Planos da plataforma
  const planos = await Promise.all([
    prisma.plano.upsert({
      where: { nome: "Basico" },
      update: {},
      create: { nome: "Basico", precoMensal: 79, limiteUsuarios: 2, recursos: ["clientes", "veiculos", "ordens_servico"] },
    }),
    prisma.plano.upsert({
      where: { nome: "Profissional" },
      update: {},
      create: {
        nome: "Profissional",
        precoMensal: 149,
        limiteUsuarios: 6,
        recursos: ["clientes", "veiculos", "ordens_servico", "orcamentos", "estoque", "financeiro", "whatsapp"],
      },
    }),
    prisma.plano.upsert({
      where: { nome: "Premium" },
      update: {},
      create: {
        nome: "Premium",
        precoMensal: 249,
        limiteUsuarios: 999,
        recursos: ["clientes", "veiculos", "ordens_servico", "orcamentos", "estoque", "financeiro", "whatsapp", "ia", "relatorios_avancados"],
      },
    }),
  ]);
  console.log(`Planos criados: ${planos.map((p) => p.nome).join(", ")}`);

  // Administrador master da plataforma
  const masterEmail = process.env.MASTER_ADMIN_EMAIL || "admin@automevo.com";
  const masterSenha = process.env.MASTER_ADMIN_PASSWORD || "mude-esta-senha";
  await prisma.superAdmin.upsert({
    where: { email: masterEmail },
    update: {},
    create: { nome: "Administrador AUTOMEVO", email: masterEmail, senhaHash: await bcrypt.hash(masterSenha, 10) },
  });
  console.log(`Super admin pronto: ${masterEmail}`);

  // Oficina de demonstracao, com os mesmos dados mock usados no frontend
  const oficinaExistente = await prisma.oficina.findFirst({ where: { email: "demo@automevo.com" } });
  if (oficinaExistente) {
    console.log("Oficina de demonstracao ja existe, pulando criacao de dados de exemplo.");
    return;
  }

  const oficina = await prisma.oficina.create({
    data: { nome: "Oficina Demonstracao", email: "demo@automevo.com", status: "ATIVA" },
  });

  await prisma.assinatura.create({
    data: { oficinaId: oficina.id, planoId: planos[1].id, status: "ATIVA", currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
  });

  await prisma.usuario.create({
    data: {
      oficinaId: oficina.id,
      nome: "Guilherme",
      email: "guilherme@automevo.com",
      senhaHash: await bcrypt.hash("123456", 10),
      perfil: "ADMIN",
    },
  });

  const cliente = await prisma.cliente.create({
    data: {
      oficinaId: oficina.id,
      nome: "Marcos Vieira",
      telefone: "(71) 98811-2233",
      email: "marcos.v@gmail.com",
      endereco: "Rua das Flores, 120 — Salvador/BA",
    },
  });

  const veiculo = await prisma.veiculo.create({
    data: { oficinaId: oficina.id, clienteId: cliente.id, placa: "PBW4C21", marca: "Fiat", modelo: "Argo Drive 1.3", ano: 2021, cor: "Branco", km: 42800 },
  });

  const peca = await prisma.peca.create({
    data: {
      oficinaId: oficina.id,
      codigo: "PC-0012",
      nome: "Pastilha de freio dianteira",
      categoria: "Freios",
      fornecedor: "Bosch",
      quantidade: 14,
      estoqueMinimo: 6,
      valorCompra: 62,
      valorVenda: 110,
    },
  });

  await prisma.ordemServico.create({
    data: {
      oficinaId: oficina.id,
      numero: 1042,
      clienteId: cliente.id,
      veiculoId: veiculo.id,
      status: "EM_ANDAMENTO",
      descricaoProblema: "Ruido ao frear",
      itens: {
        create: [
          { tipo: "PECA", pecaId: peca.id, descricao: "Pastilha de freio dianteira", quantidade: 1, valorUnitario: 110 },
          { tipo: "MAO_DE_OBRA", descricao: "Troca de pastilhas", quantidade: 1, valorUnitario: 150 },
        ],
      },
    },
  });

  console.log("Seed concluido com sucesso.");
  console.log(`Login de demonstracao -> e-mail: guilherme@automevo.com | senha: 123456`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
