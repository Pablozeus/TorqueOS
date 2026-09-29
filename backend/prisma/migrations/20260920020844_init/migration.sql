-- CreateEnum
CREATE TYPE "TipoDespesa" AS ENUM ('FIXA', 'VARIAVEL');

-- AlterTable
ALTER TABLE "contas_pagar" ADD COLUMN     "tipo" "TipoDespesa" NOT NULL DEFAULT 'VARIAVEL';
