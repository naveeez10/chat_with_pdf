/*
  Warnings:

  - Added the required column `content` to the `DocumentEmbedding` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "DocumentEmbedding" ADD COLUMN     "content" TEXT NOT NULL;
