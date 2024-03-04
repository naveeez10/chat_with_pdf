import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { PrismaVectorStore } from "@langchain/community/vectorstores/prisma";
import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import { Document, Prisma, PrismaClient } from "@prisma/client";
import { PromptTemplate } from "@langchain/core/prompts";

@Injectable()
export class QaService {
  constructor(private prisma: PrismaService) {}

  async returnAnswerForQuestionFromVectorStore(
    question: string,
    docId: string,
  ): Promise<any> {
    const context = await this.findSimilarDocuments(docId, question, 3);
    const model = new ChatOpenAI();
    const promptTemplate = PromptTemplate.fromTemplate(
      `Refer to this context: ${context} and give the solution for this question:{question}`,
    );

    const chain = promptTemplate.pipe(model);

    return await chain.invoke({ question: question });
  }

  async findSimilarDocuments(
    documentID: string,
    question: string,
    k: number,
  ): Promise<any> {
    try {
      const db = new PrismaClient();

      const vectorStore = PrismaVectorStore.withModel<Document>(db).create(
        new OpenAIEmbeddings(),
        {
          prisma: Prisma,
          tableName: 'Document',
          vectorColumnName: 'vector',
          columns: {
            id: PrismaVectorStore.IdColumn,
            content: PrismaVectorStore.ContentColumn,
            docID: PrismaVectorStore.ContentColumn,
          },
        },
      );

      const filter = {
        docID: {
          equals: documentID,
        },
      };

      console.log('document id:', documentID);
      const results = await vectorStore.similaritySearchWithScore(
        question,
        k,
        filter,
      );
      const pageContents: string[] = results.map(
        (subArray) =>
          (subArray[0] as { pageContent: string; metadata: any }).pageContent,
      );

      return JSON.stringify(pageContents);
    } catch (error) {
      console.error('Error finding similar documents:', error);
      throw error;
    }
  }
}
