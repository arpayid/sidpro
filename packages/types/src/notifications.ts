export interface ComplaintStatusEmailJob {
  type: 'complaint-status-email';
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
