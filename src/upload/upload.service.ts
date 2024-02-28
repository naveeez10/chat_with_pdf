import { Injectable } from '@nestjs/common';
import { PDFLoader } from 'langchain/document_loaders/fs/pdf';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';

@Injectable()
export class UploadService {
  async processFile(filePath: string) {
    try {
      const loader = new PDFLoader(filePath);
      const docs = await loader.load();

      const textSplitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1000,
        chunkOverlap: 200,
      });

      const chunkedDocs = await textSplitter.splitDocuments(docs);

      return chunkedDocs;
    } catch (e) {
      console.error(e);
      throw new Error('PDF docs chunking failed!');
    }
  }
}
