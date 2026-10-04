import { describe, it, expect } from 'vitest';
import { SeoGapEngine } from '@/modules/seo-intelligence/seo-gap-engine';
import { SeoPageSignals, SeoEvidenceNature, SeoPriority } from '@/modules/seo-intelligence/seo-types';

describe('SeoGapEngine Deterministic Rule Evaluation Unit Tests', () => {
  const createMockSignals = (overrides: Partial<SeoPageSignals> = {}): SeoPageSignals => ({
    url: 'https://client.com/oud',
    finalUrl: 'https://client.com/oud',
    httpStatus: 200,
    title: 'Our Fragrance Collection',
    metaDescription: 'Shop our luxury perfume bottles online.',
    canonical: 'https://client.com/oud',
    robots: 'index, follow',
    headings: {
      h1: ['Our Fragrance Collection'],
      h2: ['Products', 'About Us'],
      h3: [],
    },
    mainContentSummary: 'High quality perfumes and attar.',
    wordCount: 500,
    internalLinkCount: 6,
    externalLinkCount: 1,
    imageCount: 4,
    missingAltCount: 0,
    structuredDataTypes: [],
    faqSignals: [],
    serviceTopics: ['perfumes', 'attar'],
    locationSignals: [],
    keywordOccurrences: {
      inTitle: false,
      inMetaDescription: false,
      inH1: false,
      inH2: false,
      inBodyCount: 2,
    },
    indexability: {
      isIndexable: true,
      reason: 'HTTP 200',
    },
    capturedAt: new Date(),
    ...overrides,
  });

  const competitorSignals = [
    {
      domain: 'ajmalperfumes.com',
      signals: createMockSignals({
        url: 'https://ajmalperfumes.com/chennai/oud',
        title: 'Best Oud Perfume in Chennai | Ajmal Perfumes',
        metaDescription: 'Explore royal oud and attar perfumes in Chennai.',
        headings: {
          h1: ['Oud Perfume Chennai'],
          h2: ['FAQ', 'Store Locations'],
          h3: [],
        },
        structuredDataTypes: ['LocalBusiness', 'Product'],
        faqSignals: [{ question: 'What is oud?' }, { question: 'Do you deliver in Chennai?' }],
        keywordOccurrences: {
          inTitle: true,
          inMetaDescription: true,
          inH1: true,
          inH2: false,
          inBodyCount: 8,
        },
      }),
    },
    {
      domain: 'alharamain.com',
      signals: createMockSignals({
        url: 'https://alharamain.com/oud-chennai',
        title: 'Authentic Oud Perfume Chennai Store | Al Haramain',
        metaDescription: 'Authentic Arabian oud in Chennai.',
        headings: {
          h1: ['Oud Perfume Chennai Collection'],
          h2: ['Top Blends', 'Questions'],
          h3: [],
        },
        structuredDataTypes: ['LocalBusiness'],
        faqSignals: [{ question: 'Where is your Chennai store?' }],
        keywordOccurrences: {
          inTitle: true,
          inMetaDescription: true,
          inH1: true,
          inH2: false,
          inBodyCount: 6,
        },
      }),
    },
  ];

  it('detects TITLE_TOPIC_GAP when client title omits keyword while competitors feature it', () => {
    const clientSignals = createMockSignals({
      title: 'Luxury Perfumes & Scents',
      keywordOccurrences: {
        inTitle: false,
        inMetaDescription: false,
        inH1: false,
        inH2: false,
        inBodyCount: 1,
      },
    });

    const gaps = SeoGapEngine.evaluateGaps({
      clientSignals,
      competitorSignals,
      keyword: 'oud perfume chennai',
      location: 'Chennai',
    });

    const topicGap = gaps.find((g) => g.gapType === 'TITLE_TOPIC_GAP');
    expect(topicGap).toBeDefined();
    expect(topicGap?.nature).toBe(SeoEvidenceNature.FACT);
    expect(topicGap?.severity).toBe(SeoPriority.HIGH);
  });

  it('detects TITLE_LOCATION_GAP when target location is missing in client title', () => {
    const clientSignals = createMockSignals({
      title: 'Buy Royal Oud Perfume Online',
      keywordOccurrences: {
        inTitle: true,
        inMetaDescription: false,
        inH1: false,
        inH2: false,
        inBodyCount: 2,
      },
    });

    const gaps = SeoGapEngine.evaluateGaps({
      clientSignals,
      competitorSignals,
      keyword: 'oud perfume chennai',
      location: 'Chennai',
    });

    const locGap = gaps.find((g) => g.gapType === 'TITLE_LOCATION_GAP');
    expect(locGap).toBeDefined();
    expect(locGap?.nature).toBe(SeoEvidenceNature.FACT);
  });

  it('detects META_DESCRIPTION_MISSING when meta description is empty', () => {
    const clientSignals = createMockSignals({ metaDescription: null });

    const gaps = SeoGapEngine.evaluateGaps({
      clientSignals,
      competitorSignals,
      keyword: 'oud perfume chennai',
      location: 'Chennai',
    });

    const metaGap = gaps.find((g) => g.gapType === 'META_DESCRIPTION_MISSING');
    expect(metaGap).toBeDefined();
    expect(metaGap?.severity).toBe(SeoPriority.HIGH);
  });

  it('detects SCHEMA_OPPORTUNITY when competitors have LocalBusiness schema and client does not', () => {
    const clientSignals = createMockSignals({ structuredDataTypes: [] });

    const gaps = SeoGapEngine.evaluateGaps({
      clientSignals,
      competitorSignals,
      keyword: 'oud perfume chennai',
      location: 'Chennai',
    });

    const schemaGap = gaps.find((g) => g.gapType === 'SCHEMA_OPPORTUNITY');
    expect(schemaGap).toBeDefined();
    expect(schemaGap?.title).toContain('LocalBusiness');
  });

  it('detects FAQ_GAP when competitors implement FAQ elements and client does not', () => {
    const clientSignals = createMockSignals({ faqSignals: [] });

    const gaps = SeoGapEngine.evaluateGaps({
      clientSignals,
      competitorSignals,
      keyword: 'oud perfume chennai',
      location: 'Chennai',
    });

    const faqGap = gaps.find((g) => g.gapType === 'FAQ_GAP');
    expect(faqGap).toBeDefined();
  });

  it('detects CRITICAL INDEXABILITY_ISSUE when client page HTTP status is not 200 or robots is noindex', () => {
    const clientSignals = createMockSignals({
      httpStatus: 404,
      indexability: {
        isIndexable: false,
        reason: 'HTTP status 404 prevents indexing',
      },
    });

    const gaps = SeoGapEngine.evaluateGaps({
      clientSignals,
      competitorSignals,
      keyword: 'oud perfume chennai',
    });

    const indexGap = gaps.find((g) => g.gapType === 'INDEXABILITY_ISSUE');
    expect(indexGap).toBeDefined();
    expect(indexGap?.severity).toBe(SeoPriority.CRITICAL);
  });

  it('ensures all generated gap items have nature strictly equal to FACT or INFERRED', () => {
    const clientSignals = createMockSignals({
      title: '',
      metaDescription: '',
      canonical: null,
    });

    const gaps = SeoGapEngine.evaluateGaps({
      clientSignals,
      competitorSignals,
      keyword: 'oud perfume',
    });

    for (const g of gaps) {
      expect([SeoEvidenceNature.FACT, SeoEvidenceNature.INFERRED]).toContain(g.nature);
    }
  });
});
