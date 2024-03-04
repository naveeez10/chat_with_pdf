import { Injectable } from '@nestjs/common';
import { PDFLoader } from 'langchain/document_loaders/fs/pdf';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { OpenAIEmbeddings } from '@langchain/openai';
import { PrismaService } from '../prisma/prisma.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class UploadService {
  constructor(private prisma: PrismaService) {}

  handleFileUpload(filePath: string): { documentId: string; message: string } {
    console.log(`File uploaded at ${filePath}`);

    const docId = uuidv4();
    this.processFile(filePath, docId).catch((error) => {
      console.error('Error processing file:', error);
    });

    return {
      message: 'File uploaded successfully, processing in background.',
      documentId: docId,
    };
  }

  async processFile(filePath: string, documentID) {
    try {
      await this.prisma.document.updateMany({
        where: { docID: documentID },
        data: { processing: false },
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
      await this.prisma.document.updateMany({
        where: { docID: documentID },
        data: { processing: true },
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
      const createdDoc = await this.prisma.document.create({
        data: {
          content: doc.pageContent,
          docID: documentID,
          metadata: doc.metadata,
        },
      });
      const vectors = await embeddings.embedQuery(doc.pageContent);
      await this.prisma.$executeRaw`UPDATE "Document"
                     SET vector = ${vectors}
                     WHERE id = ${createdDoc.id}`;
    }
  }

  async findDocumentsByDocumentID(documentID: string) {
    return this.prisma.document.findMany({
      where: { docID: documentID },
    });
  }
}
