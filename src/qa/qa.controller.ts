import { Body, Controller, Param, Post } from '@nestjs/common';
import { QaService } from './qa.service';
import { CreateQuestionDto } from './CreateQuestionDto';

@Controller('qa')
export class QaController {
  constructor(private readonly qaService: QaService) {}

  @Post('/:documentId')
  async returnAnswerForQuestionFromVectorStore(
    @Param('documentId') documentId: string,
    @Body() question: CreateQuestionDto,
  ) {
    const { userPrompt } = question;
    console.log(documentId);
    return this.qaService.returnAnswerForQuestionFromVectorStore(
      userPrompt,
      documentId,
    );
  }
}
