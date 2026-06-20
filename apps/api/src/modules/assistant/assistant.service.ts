import { Injectable } from '@nestjs/common';
import { listFaqTopics, matchFaqAnswer } from './assistant.faq';
import { successResponse } from '../../common/utils/response.util';

@Injectable()
export class AssistantService {
  getFaq() {
    return successResponse({ topics: listFaqTopics() });
  }

  ask(question: string) {
    const answer = matchFaqAnswer(question.trim());
    return successResponse({
      question: question.trim(),
      answer,
      source: 'static_faq_v1',
    });
  }
}
