import { TelephonyProvider } from './telephony-provider';
import { TestTelephonyAdapter } from './test-telephony-adapter';
import { TwilioTelephonyAdapter } from './twilio-telephony-adapter';

export class TelephonyRegistry {
  private static providers: Map<string, TelephonyProvider> = new Map();
  private static defaultProviderName = 'TEST_ADAPTER';

  static {
    // Register default providers
    const testAdapter = new TestTelephonyAdapter();
    const twilioAdapter = new TwilioTelephonyAdapter();
    this.providers.set(testAdapter.name, testAdapter);
    this.providers.set(twilioAdapter.name, twilioAdapter);

    if (process.env.NODE_ENV === 'production' && process.env['TWILIO_ACCOUNT_SID']) {
      this.defaultProviderName = 'TWILIO';
    }
  }

  public static registerProvider(provider: TelephonyProvider): void {
    this.providers.set(provider.name, provider);
  }

  public static getProvider(name?: string): TelephonyProvider {
    const targetName = (name || this.defaultProviderName).toUpperCase();
    const provider = this.providers.get(targetName);
    if (!provider) {
      // Fallback to default
      const defaultProvider = this.providers.get(this.defaultProviderName);
      if (!defaultProvider) {
        const fallback = new TestTelephonyAdapter();
        this.providers.set(fallback.name, fallback);
        return fallback;
      }
      return defaultProvider;
    }
    return provider;
  }

  public static setDefaultProviderName(name: string): void {
    this.defaultProviderName = name.toUpperCase();
  }
}
