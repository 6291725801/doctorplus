import { IEmailProvider, ISmsProvider, IWhatsAppProvider } from "./providers/provider.interface";
import { MockEmailProvider, SmtpEmailProvider } from "./providers/email.provider";
import { MockSmsProvider, TwilioSmsProvider } from "./providers/sms.provider";
import { MockWhatsAppProvider, MetaWhatsAppProvider } from "./providers/whatsapp.provider";

/**
 * Provider Registry for notification channels.
 * Enables zero-downtime provider swaps, multi-gateway support, and testing mocks.
 */
class NotificationProviderRegistry {
  private emailProvider: IEmailProvider;
  private smsProvider: ISmsProvider;
  private whatsAppProvider: IWhatsAppProvider;

  constructor() {
    // Default initialization based on environment
    if (process.env.NODE_ENV === "test") {
      this.emailProvider = new MockEmailProvider();
      this.smsProvider = new MockSmsProvider();
      this.whatsAppProvider = new MockWhatsAppProvider();
    } else {
      this.emailProvider = new SmtpEmailProvider();
      this.smsProvider = process.env.TWILIO_ACCOUNT_SID ? new TwilioSmsProvider() : new MockSmsProvider();
      this.whatsAppProvider = process.env.WHATSAPP_ACCESS_TOKEN ? new MetaWhatsAppProvider() : new MockWhatsAppProvider();
    }
  }

  getEmailProvider(): IEmailProvider {
    return this.emailProvider;
  }

  setEmailProvider(provider: IEmailProvider): void {
    this.emailProvider = provider;
  }

  getSmsProvider(): ISmsProvider {
    return this.smsProvider;
  }

  setSmsProvider(provider: ISmsProvider): void {
    this.smsProvider = provider;
  }

  getWhatsAppProvider(): IWhatsAppProvider {
    return this.whatsAppProvider;
  }

  setWhatsAppProvider(provider: IWhatsAppProvider): void {
    this.whatsAppProvider = provider;
  }

  resetDefaults(): void {
    this.emailProvider = new MockEmailProvider();
    this.smsProvider = new MockSmsProvider();
    this.whatsAppProvider = new MockWhatsAppProvider();
  }

  getProviderStatuses(): {
    email: { name: string; isConfigured: boolean };
    sms: { name: string; isConfigured: boolean };
    whatsapp: { name: string; isConfigured: boolean };
  } {
    // Does NOT expose secrets! Only returns provider name and active/configured status.
    return {
      email: {
        name: this.emailProvider.name,
        isConfigured: !!(process.env.SMTP_HOST || this.emailProvider.name.includes("Mock")),
      },
      sms: {
        name: this.smsProvider.name,
        isConfigured: !!(process.env.TWILIO_ACCOUNT_SID || process.env.MSG91_AUTH_KEY || this.smsProvider.name.includes("Mock")),
      },
      whatsapp: {
        name: this.whatsAppProvider.name,
        isConfigured: !!(process.env.WHATSAPP_ACCESS_TOKEN || process.env.TWILIO_ACCOUNT_SID || this.whatsAppProvider.name.includes("Mock")),
      },
    };
  }
}

export const providerRegistry = new NotificationProviderRegistry();
