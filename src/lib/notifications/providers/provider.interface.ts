import { ChannelSendResult } from "../types";

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
  headers?: Record<string, string>;
}

export interface IEmailProvider {
  name: string;
  sendEmail(options: SendEmailOptions): Promise<ChannelSendResult>;
}

export interface SendSmsOptions {
  to: string;
  message: string;
  from?: string;
  templateId?: string; // DLT registered template ID for India
  entityId?: string;
}

export interface ISmsProvider {
  name: string;
  sendSms(options: SendSmsOptions): Promise<ChannelSendResult>;
}

export interface SendWhatsAppOptions {
  to: string;
  message?: string;
  templateName?: string;
  languageCode?: string;
  parameters?: Record<string, string>;
  headerUrl?: string;
}

export interface IWhatsAppProvider {
  name: string;
  sendWhatsApp(options: SendWhatsAppOptions): Promise<ChannelSendResult>;
}
