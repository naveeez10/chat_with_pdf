import { Injectable } from '@nestjs/common';
import { PDFLoader } from 'langchain/document_loaders/fs/pdf';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { OpenAIEmbeddings } from '@langchain/openai';
import { PrismaService } from '../prisma/prisma.service';
import { FileEmbeddingStatus } from './file.status';

@Injectable()
export class UploadService {
  constructor(private prisma: PrismaService) {}

  async handleFileUpload(file: Express.Multer.File): Promise<{
    documentId: string;
    message: string;
  }> {
    const createdDocument = await this.prisma.documentDetail.create({
      data: {
        name: file.originalname,
        status: FileEmbeddingStatus.notStarted,
      },
    });

    console.log(`File uploaded at ${file.path}`);
    const docId = createdDocument.id;
    this.processFile(file.path, docId).catch((error) => {
      console.error('Error processing file:', error);
    });

    return {
      message: 'File uploaded successfully, processing in background.',
      documentId: docId,
    };
  }

  async processFile(filePath: string, documentID) {
    try {
      await this.prisma.documentDetail.updateMany({
        where: { id: documentID },
        data: { status: FileEmbeddingStatus.processing },
      });

      const loader = new PDFLoader(filePath);
      const chunks = await loader.load();

      const textSplitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1000,
        chunkOverlap: 200,
      });

      const docs = await textSplitter.splitDocuments(chunks);
      console.log(docs);
      await this.createAndStoreVectorEmbeddings(docs, documentID);
      await this.prisma.documentDetail.updateMany({
        where: { id: documentID },
        data: { status: FileEmbeddingStatus.completed },
      });
    } catch (e) {
      console.error(e);
      throw new Error('PDF docs chunking failed!');
    }
  }

  async createAndStoreVectorEmbeddings(docs, documentID) {
    const embeddings = new OpenAIEmbeddings({
      openAIApiKey: process.env.OPENAI_API_KEY,
    });

    for (const doc of docs) {
      const vectors = await embeddings.embedQuery(doc.pageContent);
      const createdDoc = await this.prisma.documentEmbedding.create({
        data: {
          documentId: documentID,
          content: doc.pageContent,
        },
        include: {
          document: true,
        },
      });
      await this.prisma.$executeRaw`UPDATE "DocumentEmbedding"
                     SET vector = ${vectors}
                     WHERE id = ${createdDoc.id}`;
    }
  }

  async findDocumentsByDocumentID(documentID: string) {
    return this.prisma.documentDetail.findMany({
      where: { id: documentID },
    });
  }
}
