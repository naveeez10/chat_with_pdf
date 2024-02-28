import { Injectable } from '@nestjs/common';
import { PDFLoader } from 'langchain/document_loaders/fs/pdf';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { OpenAIEmbeddings } from '@langchain/openai';
import { PGVectorStore } from '@langchain/community/vectorstores/pgvector';
import { PoolConfig } from 'pg';

@Injectable()
export class UploadService {
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
      return await this.createAndStoreVectorEmbeddings(docs);
    } catch (e) {
      console.error(e);
      throw new Error('PDF docs chunking failed!');
    }
  }

  async createAndStoreVectorEmbeddings(docs) {
    const config = {
      postgresConnectionOptions: {
        type: 'postgres',
        host: '127.0.0.1',
        port: 5433,
        user: 'postgres',
        password: 'postgres',
        database: 'chat_with_pdf',
      } as PoolConfig,
      tableName: 'documents',
      columns: {
        idColumnName: 'id',
        vectorColumnName: 'vector',
        contentColumnName: 'content',
        metadataColumnName: 'metadata',
      },
    };
    return await PGVectorStore.fromDocuments(
      docs,
      new OpenAIEmbeddings({
        openAIApiKey: 'replace_with_your_openai_api_key',
      }),
      config,
    );
  }
}
