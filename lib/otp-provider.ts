import { randomInt } from 'crypto';

export interface OtpDeliveryProvider {
  deliver(phone: string, code: string, expiresAt: Date): Promise<void>;
}

class ConsoleOtpProvider implements OtpDeliveryProvider {
  async deliver(phone: string, code: string, expiresAt: Date): Promise<void> {
    console.log(`[DEV OTP] ${phone} -> ${code} (expires ${expiresAt.toISOString()})`);
  }
}

class SmsOtpProvider implements OtpDeliveryProvider {
  async deliver(): Promise<void> {
    throw new Error('SMS provider is not configured');
  }
}

export function generateOtp(): string {
  return randomInt(10000, 100000).toString();
}

export function getOtpDeliveryProvider(): OtpDeliveryProvider {
  return process.env.OTP_MODE === 'sms' ? new SmsOtpProvider() : new ConsoleOtpProvider();
}
