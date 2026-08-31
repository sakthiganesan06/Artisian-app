// ============================================
// Auth Provider Abstraction
// Supports: "development" (dummy OTP) and "twilio" (real SMS)
// ============================================

export interface OTPResult {
  success: boolean;
  error?: string;
}

export interface VerifyResult {
  success: boolean;
  error?: string;
}

export interface AuthProvider {
  sendOTP(phone: string): Promise<OTPResult>;
  verifyOTP(phone: string, code: string): Promise<VerifyResult>;
}

// ============================================
// Development Auth Provider (dummy OTP: 123456)
// ============================================

class DevelopmentAuthProvider implements AuthProvider {
  async sendOTP(phone: string): Promise<OTPResult> {
    console.log(`[DEV AUTH] OTP for ${phone}: 123456`);
    return { success: true };
  }

  async verifyOTP(_phone: string, code: string): Promise<VerifyResult> {
    // Stateless check — works on serverless (no shared memory between invocations)
    if (code === '123456') {
      return { success: true };
    }
    return { success: false, error: 'Invalid OTP. Use 123456 in development mode.' };
  }
}

// ============================================
// Twilio Auth Provider (real SMS OTP)
// ============================================

class TwilioAuthProvider implements AuthProvider {
  private accountSid: string;
  private authToken: string;
  private serviceSid: string;

  constructor() {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

    if (!accountSid || !authToken || !serviceSid) {
      throw new Error(
        'Twilio configuration missing. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_VERIFY_SERVICE_SID environment variables.'
      );
    }

    this.accountSid = accountSid;
    this.authToken = authToken;
    this.serviceSid = serviceSid;
  }

  async sendOTP(phone: string): Promise<OTPResult> {
    try {
      const twilio = (await import('twilio')).default;
      const client = twilio(this.accountSid, this.authToken);
      
      await client.verify.v2
        .services(this.serviceSid)
        .verifications.create({ to: phone, channel: 'sms' });

      return { success: true };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to send OTP';
      console.error('[TWILIO] Send OTP error:', message);
      return { success: false, error: message };
    }
  }

  async verifyOTP(phone: string, code: string): Promise<VerifyResult> {
    try {
      const twilio = (await import('twilio')).default;
      const client = twilio(this.accountSid, this.authToken);
      
      const verification = await client.verify.v2
        .services(this.serviceSid)
        .verificationChecks.create({ to: phone, code });

      if (verification.status === 'approved') {
        return { success: true };
      }
      return { success: false, error: 'Invalid OTP. Please try again.' };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to verify OTP';
      console.error('[TWILIO] Verify OTP error:', message);
      return { success: false, error: message };
    }
  }
}

// ============================================
// Factory
// ============================================

let authProviderInstance: AuthProvider | null = null;

export function getAuthProvider(): AuthProvider {
  if (authProviderInstance) return authProviderInstance;

  const provider = process.env.AUTH_PROVIDER || 'development';

  switch (provider) {
    case 'twilio':
      authProviderInstance = new TwilioAuthProvider();
      break;
    case 'development':
    default:
      console.warn('[AUTH] Using development auth provider. OTP is always 123456.');
      authProviderInstance = new DevelopmentAuthProvider();
      break;
  }

  return authProviderInstance;
}
