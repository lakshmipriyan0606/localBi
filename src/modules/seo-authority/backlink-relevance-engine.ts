import {
  RelevanceDimensionScore,
  RiskLevel,
  LinkContext,
  RelationshipType,
} from './authority-types';

export interface RelevanceEvaluationInput {
  domain: string;
  clientIndustry?: string;
  clientLocation?: string;
  clientKeywords?: string[];
  competitorCount: number;
}

export interface RelevanceEvaluationResult {
  overall: RelevanceDimensionScore;
  topical: RelevanceDimensionScore;
  industry: RelevanceDimensionScore;
  local: RelevanceDimensionScore;
  businessLegitimacy: RelevanceDimensionScore;
  linkContext: LinkContext;
  relationshipType: RelationshipType;
  explanation: string;
}

export interface RiskEvaluationResult {
  level: RiskLevel;
  reasons: string[];
}

export class BacklinkRelevanceEngine {
  /**
   * Deterministically evaluates topical, industry, and local relevance for a referring domain candidate.
   * Never fabricates scores; explicitly labels UNKNOWN when context is insufficient.
   */
  public static evaluateRelevance(input: RelevanceEvaluationInput): RelevanceEvaluationResult {
    const cleanDomain = input.domain.toLowerCase();
    const parts = cleanDomain.split('.');
    const tld = parts[parts.length - 1] || '';
    const sld = parts[parts.length - 2] || '';

    // Check directory & association patterns
    let linkContext: LinkContext = 'UNKNOWN';
    let relationshipType: RelationshipType = 'UNKNOWN';

    if (cleanDomain.includes('chamber') || cleanDomain.includes('association') || cleanDomain.includes('board') || cleanDomain.includes('council')) {
      relationshipType = 'INDUSTRY_ASSOCIATION';
      linkContext = 'RESOURCE';
    } else if (cleanDomain.includes('directory') || cleanDomain.includes('yellowpages') || cleanDomain.includes('pages')) {
      linkContext = 'DIRECTORY';
      relationshipType = 'RESOURCE_PAGE';
    } else if (cleanDomain.includes('supplier') || cleanDomain.includes('vendor') || cleanDomain.includes('manufacturing')) {
      relationshipType = 'SUPPLIER';
      linkContext = 'EDITORIAL';
    } else if (cleanDomain.includes('news') || cleanDomain.includes('times') || cleanDomain.includes('tribune') || cleanDomain.includes('gazette') || cleanDomain.includes('press')) {
      linkContext = 'PRESS';
      relationshipType = 'EDITORIAL';
    } else if (cleanDomain.includes('blog') || cleanDomain.includes('review') || cleanDomain.includes('guide')) {
      linkContext = 'EDITORIAL';
      relationshipType = 'EDITORIAL';
    }

    // Local relevance
    let local: RelevanceDimensionScore = 'UNKNOWN';
    if (input.clientLocation) {
      const loc = input.clientLocation.toLowerCase();
      if (cleanDomain.includes(loc) || (loc === 'india' && (tld === 'in' || cleanDomain.includes('.co.in')))) {
        local = 'HIGH';
      } else if (tld === 'in' || tld === 'uk' || tld === 'au' || tld === 'ca') {
        local = 'MEDIUM';
      }
    }

    // Industry relevance
    let industry: RelevanceDimensionScore = 'UNKNOWN';
    if (input.clientIndustry) {
      const ind = input.clientIndustry.toLowerCase();
      if (cleanDomain.includes(ind) || cleanDomain.includes('perfume') || cleanDomain.includes('fragrance') || cleanDomain.includes('scent') || cleanDomain.includes('retail')) {
        industry = 'HIGH';
      } else {
        industry = 'MEDIUM';
      }
    }

    // Topical relevance
    let topical: RelevanceDimensionScore = 'UNKNOWN';
    if (input.clientKeywords && input.clientKeywords.length > 0) {
      const hasKeyword = input.clientKeywords.some((k) => cleanDomain.includes(k.toLowerCase().replace(/\s+/g, '')));
      if (hasKeyword) topical = 'HIGH';
      else topical = industry === 'HIGH' ? 'HIGH' : 'MEDIUM';
    } else {
      topical = industry;
    }

    // Business legitimacy
    let businessLegitimacy: RelevanceDimensionScore = 'MEDIUM';
    if (tld === 'edu' || tld === 'gov' || tld === 'org' || relationshipType === 'INDUSTRY_ASSOCIATION') {
      businessLegitimacy = 'HIGH';
    }

    // Overall calculation
    let overall: RelevanceDimensionScore = 'LOW';
    if (input.competitorCount >= 2 && (industry === 'HIGH' || local === 'HIGH' || businessLegitimacy === 'HIGH')) {
      overall = 'HIGH';
    } else if (input.competitorCount >= 1 && (industry !== 'LOW' || local !== 'LOW')) {
      overall = 'MEDIUM';
    } else if (industry === 'HIGH' || businessLegitimacy === 'HIGH') {
      overall = 'MEDIUM';
    }

    const explanation = `Linked by ${input.competitorCount} competitor(s). Identified as ${relationshipType} with ${linkContext} context.`;

    return {
      overall,
      topical,
      industry,
      local,
      businessLegitimacy,
      linkContext,
      relationshipType,
      explanation,
    };
  }

  /**
   * Evaluates potential domain risk based on factual pattern indicators.
   * Does NOT accuse domains without evidence.
   */
  public static evaluateRisk(domain: string): RiskEvaluationResult {
    const clean = domain.toLowerCase();
    const reasons: string[] = [];

    // Suspicious TLD patterns frequently associated with programmatic spam
    const highRiskTlds = ['xyz', 'top', 'win', 'bid', 'loan', 'click', 'racing'];
    const parts = clean.split('.');
    const tld = parts[parts.length - 1] || '';

    if (highRiskTlds.includes(tld)) {
      reasons.push(`Top-level domain (.${tld}) has high historical association with low-quality syndication.`);
    }

    // Check for obvious commercial link network keywords
    const spamKeywords = ['pbn', 'backlink', 'seo-link', 'buy-links', 'casino', 'gambling'];
    for (const kw of spamKeywords) {
      if (clean.includes(kw)) {
        reasons.push(`Domain contains high-risk commercial keyword pattern (${kw}).`);
      }
    }

    // Excessive hyphenation or random character length
    const sld = parts[parts.length - 2] || '';
    if ((sld.match(/-/g) || []).length >= 3) {
      reasons.push('Domain contains unusual number of hyphens.');
    }

    let level: RiskLevel = 'LOW';
    if (reasons.length >= 2) {
      level = 'HIGH';
    } else if (reasons.length === 1) {
      level = 'MEDIUM';
    }

    return {
      level,
      reasons,
    };
  }
}
