import { Test, TestingModule } from '@nestjs/testing';
import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';
import { mockDeep } from 'jest-mock-extended';

describe('UploadController', () => {
  let controller: UploadController;
  const service = mockDeep<UploadService>();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UploadController],
      providers: [
        {
          provide: UploadService,
          useValue: service,
        },
      ],
    }).compile();

    controller = module.get<UploadController>(UploadController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should upload a file', async () => {
    const file = {
      originalname: 'file.txt',
      buffer: Buffer.from('file content'),
    };
    const result = {
      documentId: '123',
      message: 'File uploaded',
      documentUrl: 'http://localhost:3000/uploads/123',
    };
    service.processUpload.mockResolvedValue(result);
    expect(await controller.upload(file as Express.Multer.File)).toBe(result);
  });

  it('should return status of a document', async () => {
    const document = {
      id: '123',
      name: 'file.txt',
      status: 'processed',
      documentUrl: 'http://localhost:3000/uploads/123',
    };
    service.findDocumentById.mockResolvedValue(document);
    expect(await controller.getStatus('123')).toEqual({ status: 'processed' });
  });

  it('should throw an error if file is missing', async () => {
    await expect(controller.upload(undefined)).rejects.toThrow(
      'File is missing',
    );
  });
});
