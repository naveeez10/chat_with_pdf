import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Param,
  Get,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadService } from './upload.service';
import { diskStorage } from 'multer';
import { extname } from 'path';

@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: '../uploads',
        filename: (req, file, cb) => {
          const randomName = Array(32)
            .fill(null)
            .map(() => Math.round(Math.random() * 16).toString(16))
            .join('');
          cb(null, `${randomName}${extname(file.originalname)}`);
        },
      }),
    }),
  )
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('File is missing');
    }
    try {
      const processedData = this.uploadService.handleFileUpload(file);
      console.log(processedData);
      return processedData;
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }
  @Get('status/:documentID')
  async checkProcessingStatus(@Param('documentID') documentID: string) {
    const documents =
      await this.uploadService.findDocumentsByDocumentID(documentID);
    if (documents.length === 0) {
      return { message: 'No documents found with the provided documentID.' };
    }
    return { status: documents[0].status };
  }
}
