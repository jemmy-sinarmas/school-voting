/*
  Warnings:

  - You are about to drop the column `video_path` on the `candidates` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "candidates" DROP COLUMN "video_path",
ADD COLUMN     "instagram" TEXT,
ADD COLUMN     "phone_number" TEXT,
ADD COLUMN     "programme" TEXT,
ADD COLUMN     "semester" TEXT,
ADD COLUMN     "video_url" TEXT;
