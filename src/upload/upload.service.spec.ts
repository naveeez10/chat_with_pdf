import { Test, TestingModule } from '@nestjs/testing';
import { UploadService } from './upload.service';
import { mockDeep } from 'jest-mock-extended';
import { PrismaService } from '../prisma/prisma.service';
jest.mock('@azure/storage-blob', () => ({
  BlobServiceClient: {
    fromConnectionString: jest.fn().mockImplementation(() => ({
      getContainerClient: jest.fn().mockImplementation(() => ({
        createIfNotExists: jest.fn().mockResolvedValue({}),
        setAccessPolicy: jest.fn().mockResolvedValue({}),
        getBlockBlobClient: jest.fn().mockImplementation(() => ({
          uploadFile: jest.fn().mockResolvedValue({}),
          url: 'mockedBlobUrl',
        })),
      })),
    })),
  },
}));

jest.mock('langchain/document_loaders/fs/pdf', () => ({
  PDFLoader: jest.fn().mockImplementation(() => ({
    load: jest.fn().mockResolvedValue('mocked pdf content'),
  })),
}));

jest.mock('langchain/text_splitter', () => ({
  RecursiveCharacterTextSplitter: jest.fn().mockImplementation(() => ({
    splitDocuments: jest
      .fn()
      .mockResolvedValue([{ pageContent: 'mocked page content' }]),
  })),
}));

jest.mock('@langchain/openai', () => ({
  OpenAIEmbeddings: jest.fn().mockImplementation(() => ({
    embedQuery: jest.fn().mockResolvedValue('mocked embeddings'),
  })),
}));

describe('UploadService - process upload', () => {
  let service: UploadService;
  const prismaService = mockDeep<PrismaService>();
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UploadService,
        { provide: PrismaService, useValue: prismaService },
      ],
    }).compile();
    service = module.get<UploadService>(UploadService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should process upload correctly', async () => {
    const mockFile = {
      originalname: 'test.pdf',
      path: '../RolAi-poc/src/files/workflow_automation_research.pdf',
    } as Express.Multer.File;
    const mockDocument = {
      id: '123',
      name: 'test.pdf',
      status: 'notStarted',
      documentUrl: '',
    };

    (prismaService as any).documentDetail.create.mockResolvedValue(
      mockDocument,
    );

    const result = await service.processUpload(mockFile);

    expect(result).toEqual({
      message: 'File uploaded successfully, processing in background.',
      documentId: '123',
      documentUrl: 'mockedBlobUrl',
    });
    expect((prismaService as any).documentDetail.create).toHaveBeenCalled();
  });

  it('should handle errors during the document registration', async () => {
    const mockFile = {
      originalname: 'error.pdf',
      path: 'path/to/error.pdf',
    } as Express.Multer.File;

    (prismaService as any).documentDetail.create.mockRejectedValue(
      new Error('Mocked DB error'),
    );

    await expect(service.processUpload(mockFile)).rejects.toThrow(
      'Mocked DB error',
    );
  });

  it('registers document details in the database', async () => {
    const mockFile = {
      originalname: 'testFile.pdf',
      path: 'path/to/testFile.pdf',
    } as Express.Multer.File;
    const mockCreateReturn = {
      id: 'unique_doc_id',
      name: 'testFile.pdf',
      status: 'notStarted',
      documentUrl: '',
    };
    (prismaService as any).documentDetail.create.mockResolvedValue(
      mockCreateReturn,
    );

    await service.processUpload(mockFile);

    expect((prismaService as any).documentDetail.create).toHaveBeenCalledWith({
      data: {
        name: 'testFile.pdf',
        status: 'notStarted',
        documentUrl: '',
      },
    });
  });

  it('finds and returns a document by ID', async () => {
    const documentId = 'doc_123';
    const mockDocument = {
      id: documentId,
      name: 'FoundDoc.pdf',
      status: 'completed',
      documentUrl: 'http://example.com/doc',
    };
    (prismaService as any).documentDetail.findUnique.mockResolvedValue(
      mockDocument,
    );

    const result = await service.findDocumentById(documentId);

    expect(result).toEqual(mockDocument);
    expect(
      (prismaService as any).documentDetail.findUnique,
    ).toHaveBeenCalledWith({ where: { id: documentId } });
  });
});
