import { IWhatsAppProvider, SendWhatsAppOptions } from "./provider.interface";
import { ChannelSendResult } from "../types";

/**
 * Mock WhatsApp Provider for local testing and CI/CD verification.
 */
export class MockWhatsAppProvider implements IWhatsAppProvider {
  public name = "MockWhatsAppProvider";
  public sentMessages: Array<SendWhatsAppOptions & { timestamp: Date; messageId: string }> = [];
  public simulateFailure = false;
  public failureErrorMessage = "Simulated WhatsApp API failure: Recipient WhatsApp account inactive";

  async sendWhatsApp(options: SendWhatsAppOptions): Promise<ChannelSendResult> {
    if (this.simulateFailure) {
      return {
        success: false,
        error: this.failureErrorMessage,
      };
    }

    if (!options.to || options.to.trim().length < 8) {
      return {
        success: false,
        error: `Invalid destination phone number: '${options.to}'`,
      };
    }

    const messageId = `mock_wa_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const record = {
      ...options,
      timestamp: new Date(),
      messageId,
    };

    this.sentMessages.push(record);

    if (process.env.NODE_ENV !== "test") {
      console.log(`[WHATSAPP DISPATCH] To: ${options.to} | Template: ${options.templateName || "custom"} | ID: ${messageId}`);
    }

    return {
      success: true,
      messageId,
      rawResponse: { status: "sent", messageId },
    };
  }

  clear() {
    this.sentMessages = [];
    this.simulateFailure = false;
  }
}

/**
 * Meta Cloud WhatsApp Business API Provider Architecture.
 * Standard official API for WhatsApp Business Messaging.
 * Uses Graph API v19.0+ messages endpoint.
 */
export class MetaWhatsAppProvider implements IWhatsAppProvider {
  public name = "MetaWhatsAppProvider";
  private accessToken: string;
  private phoneNumberId: string;

  constructor(config?: { accessToken?: string; phoneNumberId?: string }) {
    this.accessToken = config?.accessToken || process.env.WHATSAPP_ACCESS_TOKEN || "";
    this.phoneNumberId = config?.phoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID || "";
  }

  async sendWhatsApp(options: SendWhatsAppOptions): Promise<ChannelSendResult> {
    try {
      if (!this.accessToken || !this.phoneNumberId) {
        return {
          success: true,
          messageId: `meta_wa_stub_${Date.now()}`,
          rawResponse: { note: "WHATSAPP_ACCESS_TOKEN not set. Running in stub mode." },
        };
      }

      // Format recipient phone number: remove +, spaces, dashes
      const sanitizedPhone = options.to.replace(/[^\d]/g, "");

      const payload = options.templateName
        ? {
            messaging_product: "whatsapp",
            to: sanitizedPhone,
            type: "template",
            template: {
              name: options.templateName,
              language: { code: options.languageCode || "en_US" },
              components: options.parameters
                ? [
                    {
                      type: "body",
                      parameters: Object.entries(options.parameters).map(([_, val]) => ({
                        type: "text",
                        text: String(val),
                      })),
                    },
                  ]
                : undefined,
            },
          }
        : {
            messaging_product: "whatsapp",
            to: sanitizedPhone,
            type: "text",
            text: { body: options.message || "" },
          };

      const response = await fetch(
        `https://graph.facebook.com/v19.0/${this.phoneNumberId}/messages`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      const data = await response.json();
      if (!response.ok) {
        return {
          success: false,
          error: data.error?.message || `Meta WhatsApp dispatch failed with status ${response.status}`,
          rawResponse: data,
        };
      }

      return {
        success: true,
        messageId: data.messages?.[0]?.id || `meta_wa_${Date.now()}`,
        rawResponse: data,
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || "Meta WhatsApp network failure",
      };
    }
  }
}

/**
 * Twilio WhatsApp Messaging Provider Architecture.
 */
export class TwilioWhatsAppProvider implements IWhatsAppProvider {
  public name = "TwilioWhatsAppProvider";
  private accountSid: string;
  private authToken: string;
  private fromNumber: string;

  constructor(config?: { accountSid?: string; authToken?: string; fromNumber?: string }) {
    this.accountSid = config?.accountSid || process.env.TWILIO_ACCOUNT_SID || "";
    this.authToken = config?.authToken || process.env.TWILIO_AUTH_TOKEN || "";
    this.fromNumber = config?.fromNumber || process.env.TWILIO_WHATSAPP_NUMBER || "whatsapp:+14155238886";
  }

  async sendWhatsApp(options: SendWhatsAppOptions): Promise<ChannelSendResult> {
    try {
      if (!this.accountSid || !this.authToken) {
        return {
          success: true,
          messageId: `twilio_wa_stub_${Date.now()}`,
          rawResponse: { note: "Twilio credentials not configured. Running in stub mode." },
        };
      }

      const formattedTo = options.to.startsWith("whatsapp:") ? options.to : `whatsapp:${options.to}`;
      const url = `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`;
      const auth = Buffer.from(`${this.accountSid}:${this.authToken}`).toString("base64");
      const body = new URLSearchParams({
        To: formattedTo,
        From: this.fromNumber,
        Body: options.message || "",
      });

      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: body.toString(),
      });

      const data = await response.json();
      return {
        success: response.ok,
        messageId: data.sid || `twilio_wa_${Date.now()}`,
        error: response.ok ? undefined : data.message,
        rawResponse: data,
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || "Twilio WhatsApp dispatch failure",
      };
    }
  }
}
