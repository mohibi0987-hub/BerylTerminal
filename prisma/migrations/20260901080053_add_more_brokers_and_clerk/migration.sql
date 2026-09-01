/*
  Warnings:

  - You are about to drop the column `encryptedApiKey` on the `BrokerConnection` table. All the data in the column will be lost.
  - You are about to drop the column `encryptedApiSecret` on the `BrokerConnection` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[clerkId]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "BrokerName" ADD VALUE 'KRAKEN';
ALTER TYPE "BrokerName" ADD VALUE 'COINBASE';
ALTER TYPE "BrokerName" ADD VALUE 'TRADOVATE';

-- AlterTable
ALTER TABLE "BrokerConnection" DROP COLUMN "encryptedApiKey",
DROP COLUMN "encryptedApiSecret",
ADD COLUMN     "encryptedCredentials" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "clerkId" TEXT,
ALTER COLUMN "passwordHash" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "User_clerkId_key" ON "User"("clerkId");
