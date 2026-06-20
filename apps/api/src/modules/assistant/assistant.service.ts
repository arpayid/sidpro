import { Injectable } from '@nestjs/common';
import {
  ASSISTANT_ADAPTER_LLM_STUB,
  ASSISTANT_ADAPTER_STATIC,
  AssistantAdapter,
} from './adapters/assistant.adapter';
import { LlmStubAssistantAdapter } from './adapters/llm-stub.adapter';
import { StaticFaqAssistantAdapter } from './adapters/static-faq.adapter';
import { listFaqTopics } from './assistant.faq';
import { successResponse } from '../../common/utils/response.util';

@Injectable()
export class AssistantService {
  private readonly adapter: AssistantAdapter;

  constructor() {
    const mode = process.env.ASSISTANT_ADAPTER ?? ASSISTANT_ADAPTER_STATIC;
    this.adapter =
      mode === ASSISTANT_ADAPTER_LLM_STUB
        ? new LlmStubAssistantAdapter()
        : new StaticFaqAssistantAdapter();
  }

  getFaq() {
    return successResponse({
      topics: listFaqTopics(),
      adapter: process.env.ASSISTANT_ADAPTER ?? ASSISTANT_ADAPTER_STATIC,
    });
  }

  ask(question: string) {
    const result = this.adapter.ask(question.trim());
    return successResponse({
      question: question.trim(),
      answer: result.answer,
      source: result.source,
    });
  }
}
