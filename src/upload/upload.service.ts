import { Injectable } from '@nestjs/common';
import { PDFLoader } from 'langchain/document_loaders/fs/pdf';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';

@Injectable()
export class UploadService {
  async processFile(filePath: string) {
    try {
      console.log(filePath);
      const loader = new PDFLoader(filePath);
      const docs = await loader.load();

      const textSplitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1000,
        chunkOverlap: 200,
      });

      return await textSplitter.splitDocuments(docs);
    } catch (e) {
      console.error(e);
      throw new Error('PDF docs chunking failed!');
    }
  }
}
