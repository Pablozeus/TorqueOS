require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");

const { apiLimiter } = require("./middleware/rateLimiter");
const errorHandler = require("./middleware/errorHandler");

const authRoutes = require("./routes/auth.routes");
const clientesRoutes = require("./routes/clientes.routes");
const veiculosRoutes = require("./routes/veiculos.routes");
const ordensRoutes = require("./routes/ordens.routes");
const orcamentosRoutes = require("./routes/orcamentos.routes");
const estoqueRoutes = require("./routes/estoque.routes");
const financeiroRoutes = require("./routes/financeiro.routes");
const dashboardRoutes = require("./routes/dashboard.routes");
const masterRoutes = require("./routes/master.routes");
const usuariosRoutes = require("./routes/usuarios.routes");
const assinaturaRoutes = require("./routes/assinatura.routes");
const webhooksRoutes = require("./routes/webhooks.routes");

const app = express();

// Seguranca basica: headers protetores, CORS restrito a origem configurada
// e rate limit geral (protecao extra contra forca bruta fica nas rotas de auth).
app.use(helmet());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "https://automevo-rm3g.onrender.com",
    credentials: true,
  })
);
app.use(express.json({ limit: "5mb" })); // limite maior por causa de fotos em base64 na OS
app.use(apiLimiter);

app.get("/health", (req, res) => res.json({ status: "ok", timestamp: new Date().toISOString() }));

app.use("/api/auth", authRoutes);
app.use("/api/clientes", clientesRoutes);
app.use("/api/veiculos", veiculosRoutes);
app.use("/api/ordens", ordensRoutes);
app.use("/api/orcamentos", orcamentosRoutes);
app.use("/api/estoque", estoqueRoutes);
app.use("/api/financeiro", financeiroRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/master", masterRoutes);
app.use("/api/usuarios", usuariosRoutes);
app.use("/api/assinatura", assinaturaRoutes);
app.use("/api/webhooks", webhooksRoutes);

app.use((req, res) => res.status(404).json({ erro: "Rota nao encontrada." }));
app.use(errorHandler);

module.exports = app;
