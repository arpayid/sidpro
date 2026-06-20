import type { AssistantAdapter, AssistantAnswer } from './assistant.adapter';

export class LlmStubAssistantAdapter implements AssistantAdapter {
  ask(question: string): AssistantAnswer {
    return {
      answer:
        'Integrasi LLM eksternal belum dikonfigurasi. Set `ASSISTANT_ADAPTER=static` atau hubungkan provider via adapter resmi. Pertanyaan Anda: "' +
        question.slice(0, 120) +
        '".',
      source: 'llm_stub_v1',
    };
  }
}
