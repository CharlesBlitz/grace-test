interface TwilioConfig {
  accountSid: string;
  authToken: string;
  phoneNumber: string;
}

interface SMSOptions {
  to: string;
  message: string;
  from?: string;
}

interface VoiceCallOptions {
  to: string;
  message: string;
  from?: string;
  useElevenLabs?: boolean;
  voiceId?: string;
}

interface TwilioResponse {
  success: boolean;
  sid?: string;
  error?: string;
  status?: string;
}

export class TwilioService {
  private config: TwilioConfig;

  constructor(config: TwilioConfig) {
    this.config = config;
  }

  private getAuthHeader(): string {
    return `Basic ${btoa(`${this.config.accountSid}:${this.config.authToken}`)}`;
  }

  async sendSMS(options: SMSOptions): Promise<TwilioResponse> {
    try {
      const from = options.from || this.config.phoneNumber;

      const body = new URLSearchParams({
        To: options.to,
        From: from,
        Body: options.message,
      });

      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${this.config.accountSid}/Messages.json`,
        {
          method: 'POST',
          headers: {
            'Authorization': this.getAuthHeader(),
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: body.toString(),
        }
      );

      const result = await response.json();

      if (response.ok) {
        return {
          success: true,
          sid: result.sid,
          status: result.status,
        };
      } else {
        return {
          success: false,
          error: result.message || 'Failed to send SMS',
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async makeCall(options: VoiceCallOptions): Promise<TwilioResponse> {
    try {
      const from = options.from || this.config.phoneNumber;

      const twimlUrl = this.generateTwiMLUrl(options.message);

      const body = new URLSearchParams({
        To: options.to,
        From: from,
        Url: twimlUrl,
      });

      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${this.config.accountSid}/Calls.json`,
        {
          method: 'POST',
          headers: {
            'Authorization': this.getAuthHeader(),
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: body.toString(),
        }
      );

      const result = await response.json();

      if (response.ok) {
        return {
          success: true,
          sid: result.sid,
          status: result.status,
        };
      } else {
        return {
          success: false,
          error: result.message || 'Failed to initiate call',
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private generateTwiMLUrl(message: string): string {
    const encodedMessage = encodeURIComponent(message);
    return `https://twimlets.com/echo?Twiml=%3CResponse%3E%3CSay%20voice%3D%22Polly.Joanna%22%3E${encodedMessage}%3C%2FSay%3E%3C%2FResponse%3E`;
  }

  async sendBulkSMS(recipients: string[], message: string): Promise<TwilioResponse[]> {
    const results: TwilioResponse[] = [];

    for (const recipient of recipients) {
      const result = await this.sendSMS({
        to: recipient,
        message,
      });
      results.push(result);

      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    return results;
  }

  async sendTemplatedSMS(options: {
    to: string;
    template: string;
    variables: Record<string, string>;
  }): Promise<TwilioResponse> {
    let message = options.template;

    for (const [key, value] of Object.entries(options.variables)) {
      message = message.replace(new RegExp(`{{${key}}}`, 'g'), value);
    }

    return this.sendSMS({
      to: options.to,
      message,
    });
  }

  formatPhoneNumber(phone: string): string {
    const cleaned = phone.replace(/\D/g, '');

    if (cleaned.startsWith('44')) {
      return `+${cleaned}`;
    } else if (cleaned.startsWith('0')) {
      return `+44${cleaned.substring(1)}`;
    } else if (cleaned.length === 10) {
      return `+44${cleaned}`;
    }

    return `+${cleaned}`;
  }

  validatePhoneNumber(phone: string): boolean {
    const cleaned = phone.replace(/\D/g, '');
    return cleaned.length >= 10 && cleaned.length <= 15;
  }
}

export function createTwilioService(
  accountSid: string,
  authToken: string,
  phoneNumber: string
): TwilioService {
  return new TwilioService({
    accountSid,
    authToken,
    phoneNumber,
  });
}

export const SMS_TEMPLATES = {
  MEDICATION_REMINDER: 'Hi {{name}}, time to take your {{medication}}. - Grace Companion',
  APPOINTMENT_REMINDER: 'Hi {{name}}, you have an appointment for {{appointment}} at {{time}}. - Grace Companion',
  WELLNESS_CHECK: 'Hi {{name}}, how are you feeling today? Please respond. - Grace Companion',
  EMERGENCY_ALERT: 'URGENT: {{name}} needs immediate attention. {{reason}}. - Grace Companion',
  FAMILY_UPDATE: 'Update for {{resident}}: {{message}}. - Grace Companion',
  TASK_REMINDER: 'Hi {{name}}, reminder: {{task}}. - Grace Companion',
  ESCALATION_ALERT: 'ALERT: {{name}} has missed {{count}} reminders for "{{task}}". Please check on them. - Grace Companion',
  INCIDENT_ALERT: 'INCIDENT ALERT: {{severity}} severity incident detected for {{name}}. {{details}}. - Grace Companion',
  WELLNESS_REPORT: 'Weekly wellness summary for {{name}}: {{summary}}. - Grace Companion',
};
