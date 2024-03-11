import { Body, Controller, Post } from '@nestjs/common';
import { QaService } from './qa.service';
import { CreateQuestionDto } from './CreateQuestionDto';

@Controller('qa')
export class QaController {
  constructor(private readonly qaService: QaService) {}

  @Post('/')
  async returnAnswerForQuestionFromVectorStore(
    @Body() question: CreateQuestionDto,
  ) {
    const { userPrompt, documentIds } = question;
    console.log(documentIds);
    return this.qaService.returnAnswerForQuestionFromVectorStore(
      userPrompt,
      documentIds,
    );
  }
}
