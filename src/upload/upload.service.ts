import { Injectable } from '@nestjs/common';
import { PDFLoader } from 'langchain/document_loaders/fs/pdf';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { OpenAIEmbeddings } from '@langchain/openai';
import { PrismaService } from '../prisma/prisma.service';
import { FileEmbeddingStatus } from './file.status';
import { BlobServiceClient } from '@azure/storage-blob';

@Injectable()
export class UploadService {
  constructor(private prisma: PrismaService) {}

  async handleFileUpload(file: Express.Multer.File): Promise<{
    documentId: string;
    message: string;
    documentUrl: string;
  }> {
    const createdDocument = await this.prisma.documentDetail.create({
      data: {
        name: file.originalname,
        status: FileEmbeddingStatus.notStarted,
        documentUrl: '',
      },
    });

    const docId = createdDocument.id;

    try {
      const blobServiceClient = BlobServiceClient.fromConnectionString(
        process.env.AZURE_STORAGE_CONNECTION_STRING,
      );
      const containerClient = blobServiceClient.getContainerClient('azurite');
      await containerClient.createIfNotExists();

      const blockBlobClient = containerClient.getBlockBlobClient(
        `${docId}/${file.originalname}`,
      );
      await blockBlobClient.uploadFile(file.path);

      const documentUrl = blockBlobClient.url;

      await this.prisma.documentDetail.update({
        where: { id: docId },
        data: { documentUrl: documentUrl },
      });

      console.log(`File uploaded at ${documentUrl}`);

      this.processFile(file.path, docId).catch((error) => {
        console.error('Error processing file:', error);
      });

      return {
        message: 'File uploaded successfully, processing in background.',
        documentId: docId,
        documentUrl: documentUrl,
      };
    } catch (error) {
      console.error(
        'Error uploading file to Azurite or updating database:',
        error,
      );
    }
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
