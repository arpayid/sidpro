export const NOTIFICATION_QUEUE_NAME = 'notifications' as const;
export const COMPLAINT_STATUS_EMAIL_JOB_NAME = 'complaint-status-email' as const;

export interface ComplaintStatusEmailJob {
  type: typeof COMPLAINT_STATUS_EMAIL_JOB_NAME;
  tenantId: string;
  complaintId: string;
  ticket: string;
  title: string;
  reporterEmail: string;
  reporterName?: string | null;
  fromStatus: string;
  toStatus: string;
  fromStatusLabel: string;
  statusLabel: string;
  note?: string | null;
  appUrl?: string;
}

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export interface EmailAdapter {
  send(message: EmailMessage): Promise<void>;
}

export interface LetterPdfJob {
  type: 'letter-pdf-generation';
  letterId: string;
  tenantId: string;
  requestedBy: string;
  templateId?: string;
  templateVersion?: number;
}
