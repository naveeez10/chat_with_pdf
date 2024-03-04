import { Body, Controller, Post } from '@nestjs/common';
import { QaService } from './qa.service';
import { CreateQuestionDto } from './CreateQuestionDto';

@Controller('qa')
export class QaController {
  constructor(private readonly qaService: QaService) {}

  @Post()
  async returnAnswerForQuestionFromVectorStore(
    @Body() question: CreateQuestionDto,
  ) {
    const { userPrompt } = question;
    return this.qaService.returnAnswerForQuestionFromVectorStore(userPrompt);
  }
}
