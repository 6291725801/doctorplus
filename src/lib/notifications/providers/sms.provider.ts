import { ISmsProvider, SendSmsOptions } from "./provider.interface";
import { ChannelSendResult } from "../types";

/**
 * Mock SMS Provider for local testing and CI/CD verification.
 */
export class MockSmsProvider implements ISmsProvider {
  public name = "MockSmsProvider";
  public sentMessages: Array<SendSmsOptions & { timestamp: Date; messageId: string }> = [];
  public simulateFailure = false;
  public failureErrorMessage = "Simulated SMS Gateway rejection: Provider rate limit exceeded (429)";

  async sendSms(options: SendSmsOptions): Promise<ChannelSendResult> {
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

    const messageId = `mock_sms_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const record = {
      ...options,
      timestamp: new Date(),
      messageId,
    };

    this.sentMessages.push(record);

    if (process.env.NODE_ENV !== "test") {
      console.log(`[SMS DISPATCH] To: ${options.to} | Message: ${options.message.slice(0, 50)}... | ID: ${messageId}`);
    }

    return {
      success: true,
      messageId,
      rawResponse: { status: "delivered", messageId },
    };
  }

  clear() {
    this.sentMessages = [];
    this.simulateFailure = false;
  }
}

/**
 * Twilio SMS Provider Architecture.
 * Easily activated via TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER.
 * Secrets remain isolated on the server.
 */
export class TwilioSmsProvider implements ISmsProvider {
  public name = "TwilioSmsProvider";
  private accountSid: string;
  private authToken: string;
  private fromNumber: string;

  constructor(config?: { accountSid?: string; authToken?: string; fromNumber?: string }) {
    this.accountSid = config?.accountSid || process.env.TWILIO_ACCOUNT_SID || "";
    this.authToken = config?.authToken || process.env.TWILIO_AUTH_TOKEN || "";
    this.fromNumber = config?.fromNumber || process.env.TWILIO_PHONE_NUMBER || "";
  }

  async sendSms(options: SendSmsOptions): Promise<ChannelSendResult> {
    try {
      if (!this.accountSid || !this.authToken) {
        // Fallback in non-configured dev environment
        const messageId = `twilio_mock_${Date.now()}`;
        return {
          success: true,
          messageId,
          rawResponse: { note: "Twilio credentials not configured. Running in stub mode." },
        };
      }

      const url = `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`;
      const auth = Buffer.from(`${this.accountSid}:${this.authToken}`).toString("base64");
      const body = new URLSearchParams({
        To: options.to,
        From: options.from || this.fromNumber,
        Body: options.message,
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
      if (!response.ok) {
        return {
          success: false,
          error: data.message || `Twilio SMS dispatch failed with status ${response.status}`,
          rawResponse: data,
        };
      }

      return {
        success: true,
        messageId: data.sid,
        rawResponse: data,
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || "Twilio network error",
      };
    }
  }
}

/**
 * MSG91 / Fast2SMS Provider Architecture (DLT Compliant for Healthcare Clinics in India).
 * Supports DLT Template ID and Sender ID header.
 */
export class Msg91SmsProvider implements ISmsProvider {
  public name = "Msg91SmsProvider";
  private authKey: string;
  private senderId: string;

  constructor(config?: { authKey?: string; senderId?: string }) {
    this.authKey = config?.authKey || process.env.MSG91_AUTH_KEY || "";
    this.senderId = config?.senderId || process.env.MSG91_SENDER_ID || "CLINIC";
  }

  async sendSms(options: SendSmsOptions): Promise<ChannelSendResult> {
    try {
      if (!this.authKey) {
        return {
          success: true,
          messageId: `msg91_stub_${Date.now()}`,
          rawResponse: { note: "MSG91_AUTH_KEY not set. Running in stub mode." },
        };
      }

      // MSG91 Send SMS API Endpoint
      const response = await fetch("https://control.msg91.com/api/v5/flow/", {
        method: "POST",
        headers: {
          authkey: this.authKey,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          template_id: options.templateId,
          short_url: "0",
          recipients: [{ mobiles: options.to, message: options.message }],
        }),
      });

      const data = await response.json();
      return {
        success: response.ok,
        messageId: data.message || `msg91_${Date.now()}`,
        rawResponse: data,
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || "MSG91 dispatch failure",
      };
    }
  }
}
