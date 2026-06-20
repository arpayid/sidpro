import { matchFaqAnswer } from '../assistant.faq';
import type { AssistantAdapter, AssistantAnswer } from './assistant.adapter';

export class StaticFaqAssistantAdapter implements AssistantAdapter {
  ask(question: string): AssistantAnswer {
    return {
      answer: matchFaqAnswer(question),
      source: 'static_faq_v1',
    };
  }
}
