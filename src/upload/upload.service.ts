import { Injectable } from '@nestjs/common';
import { PDFLoader } from 'langchain/document_loaders/fs/pdf';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { OpenAIEmbeddings } from '@langchain/openai';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UploadService {
  constructor(private prisma: PrismaService) {}

  async processFile(filePath: string) {
    try {
      console.log(filePath);
      const loader = new PDFLoader(filePath);
      const chunks = await loader.load();

      const textSplitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1000,
        chunkOverlap: 200,
      });

      const docs = await textSplitter.splitDocuments(chunks);
      console.log(docs);
      return await this.createAndStoreVectorEmbeddings(docs);
    } catch (e) {
      console.error(e);
      throw new Error('PDF docs chunking failed!');
    }
  }

  async createAndStoreVectorEmbeddings(docs) {
    const embeddings = new OpenAIEmbeddings({
      openAIApiKey: '',
    });

    const documentID = 'lolxdxd';

    for (const doc of docs) {
      const createdDoc = await this.prisma.document.create({
        data: {
          content: doc.pageContent,
          docID: documentID,
          metadata: doc.metadata,
        },
      });
      const vectors = await embeddings.embedQuery(doc.pageContent);
      await this.prisma
        .$executeRaw`UPDATE "Document" SET vector = ${vectors} WHERE id = ${createdDoc.id}`;
    }
  }
}
