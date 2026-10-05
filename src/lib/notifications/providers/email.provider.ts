import nodemailer, { type Transporter } from "nodemailer";
import { IEmailProvider, SendEmailOptions } from "./provider.interface";
import { ChannelSendResult } from "../types";

/**
 * Mock Email Provider for testing and development.
 * Captures sent emails in an accessible buffer and supports simulating failures.
 */
export class MockEmailProvider implements IEmailProvider {
  public name = "MockEmailProvider";
  public sentEmails: Array<SendEmailOptions & { timestamp: Date; messageId: string }> = [];
  public simulateFailure = false;
  public failureErrorMessage = "Simulated SMTP connection timeout (ETIMEDOUT)";

  async sendEmail(options: SendEmailOptions): Promise<ChannelSendResult> {
    if (this.simulateFailure) {
      return {
        success: false,
        error: this.failureErrorMessage,
      };
    }

    if (!options.to || !options.to.includes("@")) {
      return {
        success: false,
        error: `Invalid recipient email address: '${options.to}'`,
      };
    }

    const messageId = `mock_mail_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const record = {
      ...options,
      timestamp: new Date(),
      messageId,
    };

    this.sentEmails.push(record);

    if (process.env.NODE_ENV !== "test") {
      console.log(`[EMAIL DISPATCH] To: ${options.to} | Subject: ${options.subject} | ID: ${messageId}`);
    }

    return {
      success: true,
      messageId,
      rawResponse: { status: "queued", messageId },
    };
  }

  clear() {
    this.sentEmails = [];
    this.simulateFailure = false;
  }
}

/**
 * Production SMTP Email Provider Architecture.
 * Pluggable implementation supporting standard SMTP relays (Gmail, SendGrid, Mailgun, Amazon SES, custom SMTP).
 * Keeps credentials in server environment variables without frontend exposure.
 */
export class SmtpEmailProvider implements IEmailProvider {
  public name = "SmtpEmailProvider";
  private transporter: Transporter | null = null;
  private defaultFrom: string;

  constructor(config?: {
    host?: string;
    port?: number;
    user?: string;
    pass?: string;
    from?: string;
  }) {
    const host = config?.host || process.env.SMTP_HOST || "smtp.gmail.com";
    const port = config?.port || Number(process.env.SMTP_PORT) || 587;
    const user = config?.user || process.env.SMTP_USER || "";
    const pass = config?.pass || process.env.SMTP_PASS || "";
    this.defaultFrom = config?.from || process.env.SMTP_FROM || user || "rohitkumar725801@gmail.com";

    if (user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: {
          user,
          pass,
        },
      });
    }
  }

  async sendEmail(options: SendEmailOptions): Promise<ChannelSendResult> {
    try {
      if (!this.transporter) {
        const messageId = `smtp_dev_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        console.log(`\n================== [EMAIL DISPATCH - DEV SIMULATION] ==================`);
        console.log(`📨 To: ${options.to}`);
        console.log(`📌 Subject: ${options.subject}`);
        console.log(`📝 Content:\n${options.text || options.html}`);
        console.log(`💡 (To send live emails, set SMTP_USER and SMTP_PASS in your .env file)`);
        console.log(`=======================================================================\n`);
        return {
          success: true,
          messageId,
          rawResponse: { mode: "dev_fallback" },
        };
      }

      const info = await this.transporter.sendMail({
        from: options.from || this.defaultFrom,
        to: options.to,
        subject: options.subject,
        text: options.text || options.html?.replace(/<[^>]+>/g, " "),
        html: options.html,
      });

      console.log(`[LIVE EMAIL SENT] To: ${options.to} | MessageId: ${info.messageId}`);
      return {
        success: true,
        messageId: info.messageId,
        rawResponse: info,
      };
    } catch (err: any) {
      console.error("[EMAIL DISPATCH ERROR]", err.message);
      return {
        success: false,
        error: err.message || "Failed to dispatch email via SMTP provider",
      };
    }
  }
}


