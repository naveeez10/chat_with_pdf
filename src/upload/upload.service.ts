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

  async processUpload(file: Express.Multer.File): Promise<{
    documentId: string;
    message: string;
    documentUrl: string;
  }> {
    const createdDocument = await this.registerDocument(file);
    console.log('Created document:', createdDocument);
    const docId = createdDocument.id;
    try {
      const documentUrl = await this.uploadToBlobStorage(file, docId);
      await this.updateDocumentUrl(docId, documentUrl);

      this.processFile(file.path, docId).catch((error) => {
        console.error('Error processing file:', error);
      });

      return {
        message: 'File uploaded successfully, processing in background.',
        documentId: docId,
        documentUrl,
      };
    } catch (error) {
      console.error('Error handling the upload process:', error);
    }
  }

  private async registerDocument(file: Express.Multer.File) {
    return this.prisma.documentDetail.create({
      data: {
        name: file.originalname,
        status: FileEmbeddingStatus.notStarted,
        documentUrl: '',
      },
    });
  }

  private async uploadToBlobStorage(
    file: Express.Multer.File,
    documentId: string,
  ) {
    const blobServiceClient = BlobServiceClient.fromConnectionString(
      process.env.AZURE_STORAGE_CONNECTION_STRING,
    );
    const containerClient =
      blobServiceClient.getContainerClient('document-storage');
    await containerClient.createIfNotExists();
    await containerClient.setAccessPolicy('container');

    const blockBlobClient = containerClient.getBlockBlobClient(
      `${documentId}/${file.originalname}`,
    );
    await blockBlobClient.uploadFile(file.path);

    console.log(`File uploaded at ${blockBlobClient.url}`);
    return blockBlobClient.url;
  }

  private async updateDocumentUrl(documentId: string, documentUrl: string) {
    await this.prisma.documentDetail.update({
      where: { id: documentId },
      data: { documentUrl },
    });
  }

  async processFile(filePath: string, documentId: string) {
    await this.setDocumentStatus(documentId, FileEmbeddingStatus.processing);

    try {
      const chunks = await this.loadPDFChunks(filePath);
      await this.createAndStoreVectorEmbeddings(chunks, documentId);
      await this.setDocumentStatus(documentId, FileEmbeddingStatus.completed);
    } catch (e) {
      await this.setDocumentStatus(documentId, FileEmbeddingStatus.failed);
      console.error(e);
      throw new Error('Processing PDF failed!');
    }
  }

  private async loadPDFChunks(filePath: string) {
    const loader = new PDFLoader(filePath);
    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });
    return textSplitter.splitDocuments(await loader.load());
  }

  private async setDocumentStatus(
    documentId: string,
    status: FileEmbeddingStatus,
  ) {
    await this.prisma.documentDetail.updateMany({
      where: { id: documentId },
      data: { status },
    });
  }

  async createAndStoreVectorEmbeddings(docs, documentId: string) {
    const embeddings = new OpenAIEmbeddings({
      openAIApiKey: process.env.OPENAI_API_KEY,
    });

    for (const doc of docs) {
      const vectors = await embeddings.embedQuery(doc.pageContent);
      await this.storeDocumentEmbedding(documentId, doc.pageContent, vectors);
    }
  }

  private async storeDocumentEmbedding(
    documentId: string,
    content: string,
    vectors: any,
  ) {
    const createdDoc = await this.prisma.documentEmbedding.create({
      data: { documentId, content },
      include: { document: true },
    });
    await this.prisma.$executeRaw`UPDATE "DocumentEmbedding"
                     SET vector = ${vectors}
                     WHERE id = ${createdDoc.id}`;
  }

  async findDocumentById(documentId: string) {
    return this.prisma.documentDetail.findUnique({
      where: { id: documentId },
    });
  }
}
