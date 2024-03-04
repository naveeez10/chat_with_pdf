import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class QaService {
  constructor(private prisma: PrismaService) {}
  async returnAnswerForQuestionFromVectorStore(
    question: string,
    docId: string,
  ): Promise<any> {
    const queryVector =
  }

  async findSimilarDocuments(
    documentID: string,
    queryVector: number[],
    k: number,
  ): Promise<any> {
    try {
      const vectorsAndIds = await this.prisma.document.findMany({
        where: {
          docID: documentID,
        },
        select: {
          id: true,
          vector: true, // Make sure this is correctly typed to match your expected vector format
        },
      });

      const similarityScores = vectorsAndIds.map((doc) => ({
        id: doc.id,
        score: QaService.calculateVectorSimilarity(queryVector, doc.vector), // Call the static method correctly
      }));

      similarityScores.sort((a, b) => b.score - a.score);

      return similarityScores.slice(0, k);
    } catch (error) {
      console.error('Error finding similar documents:', error);
      throw error;
    }
  }

  private static calculateVectorSimilarity(
    vectorA: number[],
    vectorB: number[],
  ): number {
    let dotProduct = 0;
    for (let i = 0; i < vectorA.length; i++) {
      dotProduct += vectorA[i] * vectorB[i];
    }

    let magnitudeA = 0;
    for (const element of vectorA) {
      magnitudeA += element * element;
    }
    magnitudeA = Math.sqrt(magnitudeA);

    let magnitudeB = 0;
    for (const element of vectorB) {
      magnitudeB += element * element;
    }
    magnitudeB = Math.sqrt(magnitudeB);
    return dotProduct / (magnitudeA * magnitudeB);
  }
}
