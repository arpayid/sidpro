export interface AssistantAnswer {
  answer: string;
  source: string;
}

export interface AssistantAdapter {
  ask(question: string): AssistantAnswer;
}

export const ASSISTANT_ADAPTER_STATIC = 'static';
export const ASSISTANT_ADAPTER_LLM_STUB = 'llm_stub';
