/*
  Warnings:

  - You are about to drop the column `adobeProjectId` on the `DesignVersion` table. All the data in the column will be lost.
  - You are about to drop the column `designId` on the `DesignVersion` table. All the data in the column will be lost.
  - You are about to drop the column `serializedState` on the `DesignVersion` table. All the data in the column will be lost.
  - You are about to drop the `Asset` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Brief` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Client` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Design` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Feedback` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `WhatsAppMessage` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[versionNumber]` on the table `DesignVersion` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "Asset" DROP CONSTRAINT "Asset_versionId_fkey";

-- DropForeignKey
ALTER TABLE "Brief" DROP CONSTRAINT "Brief_clientId_fkey";

-- DropForeignKey
ALTER TABLE "Design" DROP CONSTRAINT "Design_briefId_fkey";

-- DropForeignKey
ALTER TABLE "DesignVersion" DROP CONSTRAINT "DesignVersion_designId_fkey";

-- DropForeignKey
ALTER TABLE "Feedback" DROP CONSTRAINT "Feedback_versionId_fkey";

-- DropIndex
DROP INDEX "DesignVersion_designId_versionNumber_key";

-- AlterTable
ALTER TABLE "DesignVersion" DROP COLUMN "adobeProjectId",
DROP COLUMN "designId",
DROP COLUMN "serializedState";

-- DropTable
DROP TABLE "Asset";

-- DropTable
DROP TABLE "Brief";

-- DropTable
DROP TABLE "Client";

-- DropTable
DROP TABLE "Design";

-- DropTable
DROP TABLE "Feedback";

-- DropTable
DROP TABLE "WhatsAppMessage";

-- CreateIndex
CREATE UNIQUE INDEX "DesignVersion_versionNumber_key" ON "DesignVersion"("versionNumber");
