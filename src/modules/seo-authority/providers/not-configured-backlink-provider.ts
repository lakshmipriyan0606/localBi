import {
  BacklinkProvider,
  BacklinkProviderDomainSummary,
  CompetitorReferringDomainResult,
  ListBacklinksInput,
  ListBacklinksOutput,
  ListReferringDomainsInput,
  ListReferringDomainsOutput,
} from './backlink-provider.interface';
import { BacklinkProviderState } from '../authority-types';

export class NotConfiguredBacklinkProvider implements BacklinkProvider {
  public readonly providerName = 'NOT_CONFIGURED';

  public async getState(): Promise<BacklinkProviderState> {
    return 'NOT_CONFIGURED';
  }

  public async getDomainSummary(_domain: string): Promise<BacklinkProviderDomainSummary | null> {
    return null;
  }

  public async listBacklinks(_input: ListBacklinksInput): Promise<ListBacklinksOutput> {
    return {
      items: [],
      hasMore: false,
    };
  }

  public async listReferringDomains(_input: ListReferringDomainsInput): Promise<ListReferringDomainsOutput> {
    return {
      items: [],
      hasMore: false,
    };
  }

  public async getCompetitorReferringDomains(
    _competitorDomains: string[],
    _clientDomain: string
  ): Promise<CompetitorReferringDomainResult[]> {
    return [];
  }
}
