import { BacklinkProvider } from './backlink-provider.interface';
import { DataForSeoBacklinkProvider } from './dataforseo-backlink-provider';
import { NotConfiguredBacklinkProvider } from './not-configured-backlink-provider';
import { BacklinkProviderState } from '../authority-types';

export class BacklinkProviderRegistry {
  private static customProvider: BacklinkProvider | null = null;

  /**
   * Sets a custom or mock provider (used for integration/unit testing).
   */
  public static setProvider(provider: BacklinkProvider | null): void {
    this.customProvider = provider;
  }

  /**
   * Returns the active backlink provider.
   * If credentials are provided for DataForSEO, returns DataForSeoBacklinkProvider.
   * Otherwise returns NotConfiguredBacklinkProvider.
   */
  public static getProvider(): BacklinkProvider {
    if (this.customProvider) {
      return this.customProvider;
    }

    const dataforseo = new DataForSeoBacklinkProvider();
    if (dataforseo.isConfigured()) {
      return dataforseo;
    }

    return new NotConfiguredBacklinkProvider();
  }

  /**
   * Returns the provider state.
   */
  public static async getProviderState(): Promise<BacklinkProviderState> {
    return this.getProvider().getState();
  }
}
