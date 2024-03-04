import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OpenAIEmbeddings } from '@langchain/openai';
import { Prisma } from '@prisma/client';

@Injectable()
export class QaService {
  constructor(private prisma: PrismaService) {}

  async returnAnswerForQuestionFromVectorStore(
    question: string,
    docId: string,
  ): Promise<any> {
    const embeddings = new OpenAIEmbeddings();
    const queryVectors = await embeddings.embedQuery(question);

    return await this.findSimilarDocuments(docId, queryVectors, 3);
  }

  async findSimilarDocuments(
    documentID: string,
    queryVector: any,
    k: number,
  ): Promise<any> {
    try {
      const sqlQuery = `
          SELECT content
          FROM "Document"
          WHERE "docID" = $1
          ORDER BY vector <=> $2 DESC
              LIMIT $3
      `;

      await this.prisma.$executeRawUnsafe(sqlQuery, documentID, queryVector, k);
    } catch (error) {
      console.error('Error finding similar documents:', error);
      throw error;
    }
  }
}
