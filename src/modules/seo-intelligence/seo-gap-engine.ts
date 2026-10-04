import { SeoGapItem, SeoPageSignals, SeoEvidenceNature, SeoPriority } from './seo-types';

export interface GapEvaluationInput {
  clientSignals: SeoPageSignals;
  competitorSignals: Array<{
    domain: string;
    signals: SeoPageSignals;
  }>;
  keyword: string;
  location?: string | null;
}

export class SeoGapEngine {
  public static readonly VERSION = '1.0.0';

  /**
   * Deterministically evaluates on-page gaps between client page and top ranking competitors.
   * STRICT CONSTRAINT: Zero outdated superstitions (no keyword density %, no 'more words = rank higher').
   * Every gap item is clearly labeled as FACT vs INFERRED.
   */
  public static evaluateGaps(input: GapEvaluationInput): SeoGapItem[] {
    const { clientSignals, competitorSignals, keyword, location } = input;
    const gaps: SeoGapItem[] = [];

    const kwLower = keyword.toLowerCase().trim();
    const locLower = (location || '').toLowerCase().trim();

    // ── 1. TITLE GAPS ────────────────────────────────────────────────────────
    if (!clientSignals.title || clientSignals.title.trim().length === 0) {
      gaps.push({
        id: 'gap-title-missing',
        gapType: 'TITLE_MISSING',
        nature: SeoEvidenceNature.FACT,
        title: 'Missing Page Title Tag',
        clientValue: null,
        competitorComparison: competitorSignals.map((c) => ({
          domain: c.domain,
          value: c.signals.title,
        })),
        explanation:
          'The client page lacks a <title> tag. The title tag is the primary headline shown in search results.',
        severity: SeoPriority.CRITICAL,
      });
    } else {
      // Check keyword in title
      const titleLower = clientSignals.title.toLowerCase();
      if (!clientSignals.keywordOccurrences.inTitle) {
        const compTitlesWithKw = competitorSignals.filter((c) =>
          c.signals.title?.toLowerCase().includes(kwLower)
        );

        if (compTitlesWithKw.length > 0) {
          gaps.push({
            id: 'gap-title-topic',
            gapType: 'TITLE_TOPIC_GAP',
            nature: SeoEvidenceNature.FACT,
            title: `Primary Search Term Missing in Page Title`,
            clientValue: clientSignals.title,
            competitorComparison: competitorSignals.map((c) => ({
              domain: c.domain,
              value: c.signals.title,
            })),
            explanation: `Your page title does not reference the target search topic ("${keyword}"), whereas ${compTitlesWithKw.length} of ${competitorSignals.length} competitors clearly highlight it in search headlines.`,
            severity: SeoPriority.HIGH,
          });
        }
      }

      // Check location in title if location-specific search
      if (locLower && !titleLower.includes(locLower)) {
        const compWithLoc = competitorSignals.filter((c) =>
          c.signals.title?.toLowerCase().includes(locLower)
        );

        if (compWithLoc.length > 0) {
          gaps.push({
            id: 'gap-title-location',
            gapType: 'TITLE_LOCATION_GAP',
            nature: SeoEvidenceNature.FACT,
            title: `Location Relevance Missing in Title ("${location}")`,
            clientValue: clientSignals.title,
            competitorComparison: competitorSignals.map((c) => ({
              domain: c.domain,
              value: c.signals.title,
            })),
            explanation: `Local searchers in ${location} look for local confirmation. Competitors explicitly include the geographic service area in their title tags.`,
            severity: SeoPriority.MEDIUM,
          });
        }
      }
    }

    // ── 2. META DESCRIPTION GAPS ─────────────────────────────────────────────
    if (!clientSignals.metaDescription || clientSignals.metaDescription.trim().length === 0) {
      gaps.push({
        id: 'gap-meta-description-missing',
        gapType: 'META_DESCRIPTION_MISSING',
        nature: SeoEvidenceNature.FACT,
        title: 'Missing Meta Description',
        clientValue: null,
        competitorComparison: competitorSignals.map((c) => ({
          domain: c.domain,
          value: c.signals.metaDescription,
        })),
        explanation:
          'No meta description provided. Google often auto-generates snippets from random page text when a curated description is absent, which may lower click-through rate.',
        severity: SeoPriority.HIGH,
      });
    }

    // ── 3. H1 HEADINGS GAPS ──────────────────────────────────────────────────
    if (clientSignals.headings.h1.length === 0) {
      gaps.push({
        id: 'gap-h1-missing',
        gapType: 'H1_MISSING',
        nature: SeoEvidenceNature.FACT,
        title: 'Missing Main Headline (H1)',
        clientValue: 'No H1 found',
        competitorComparison: competitorSignals.map((c) => ({
          domain: c.domain,
          value: c.signals.headings.h1.join(' | ') || 'None',
        })),
        explanation:
          'Page has no primary <h1> headline. An H1 confirms topic alignment as soon as a visitor lands.',
        severity: SeoPriority.HIGH,
      });
    } else if (!clientSignals.keywordOccurrences.inH1) {
      const compH1WithKw = competitorSignals.filter((c) =>
        c.signals.headings.h1.some((h) => h.toLowerCase().includes(kwLower))
      );

      if (compH1WithKw.length > 0) {
        gaps.push({
          id: 'gap-h1-topic',
          gapType: 'H1_TOPIC_GAP',
          nature: SeoEvidenceNature.FACT,
          title: `H1 Headline Does Not Emphasize Core Topic`,
          clientValue: clientSignals.headings.h1[0] || null,
          competitorComparison: competitorSignals.map((c) => ({
            domain: c.domain,
            value: c.signals.headings.h1[0] || null,
          })),
          explanation: `Top ranking competitors align their main page heading directly with the search intent ("${keyword}").`,
          severity: SeoPriority.MEDIUM,
        });
      }
    }

    // ── 4. STRUCTURED DATA / SCHEMA GAPS ─────────────────────────────────────
    const compSchemas = competitorSignals.flatMap((c) => c.signals.structuredDataTypes);
    const hasLocalBusiness = compSchemas.some((s) => s.includes('LocalBusiness') || s.includes('Store'));
    const clientHasLocalBusiness = clientSignals.structuredDataTypes.some(
      (s) => s.includes('LocalBusiness') || s.includes('Store')
    );

    if (hasLocalBusiness && !clientHasLocalBusiness) {
      gaps.push({
        id: 'gap-schema-local-business',
        gapType: 'SCHEMA_OPPORTUNITY',
        nature: SeoEvidenceNature.FACT,
        title: 'Missing LocalBusiness / Organization Schema',
        clientValue: clientSignals.structuredDataTypes.join(', ') || 'No Schema',
        competitorComparison: competitorSignals.map((c) => ({
          domain: c.domain,
          value: c.signals.structuredDataTypes.join(', ') || 'None',
        })),
        explanation:
          'Competitors implement structured LocalBusiness schema helping Google accurately parse business hours, phone numbers, and local physical addresses.',
        severity: SeoPriority.MEDIUM,
      });
    }

    // ── 5. FAQ SIGNALS GAP ───────────────────────────────────────────────────
    const compFaqCount = competitorSignals.filter((c) => c.signals.faqSignals.length > 0).length;
    if (compFaqCount >= 2 && clientSignals.faqSignals.length === 0) {
      gaps.push({
        id: 'gap-faq',
        gapType: 'FAQ_GAP',
        nature: SeoEvidenceNature.FACT,
        title: 'Absence of Direct FAQ Sections',
        clientValue: 'No FAQ sections detected',
        competitorComparison: competitorSignals.map((c) => ({
          domain: c.domain,
          value: `${c.signals.faqSignals.length} questions identified`,
        })),
        explanation:
          'Multiple ranking competitors answer buyer questions directly with dedicated FAQ blocks, qualifying them for rich results and conversational search queries.',
        severity: SeoPriority.LOW,
      });
    }

    // ── 6. INDEXABILITY / CANONICAL ISSUES ───────────────────────────────────
    if (!clientSignals.indexability.isIndexable) {
      gaps.push({
        id: 'gap-indexability',
        gapType: 'INDEXABILITY_ISSUE',
        nature: SeoEvidenceNature.FACT,
        title: 'Critical Page Indexability Issue',
        clientValue: clientSignals.indexability.reason,
        competitorComparison: competitorSignals.map((c) => ({
          domain: c.domain,
          value: c.signals.indexability.isIndexable ? 'Indexable' : 'Blocked',
        })),
        explanation: `Search engines cannot properly index this page: ${clientSignals.indexability.reason}.`,
        severity: SeoPriority.CRITICAL,
      });
    }

    if (!clientSignals.canonical) {
      gaps.push({
        id: 'gap-canonical-missing',
        gapType: 'CANONICAL_ISSUE',
        nature: SeoEvidenceNature.FACT,
        title: 'Missing Canonical Link Element',
        clientValue: 'None',
        competitorComparison: competitorSignals.map((c) => ({
          domain: c.domain,
          value: c.signals.canonical || 'None',
        })),
        explanation:
          'Declaring a self-referencing canonical tag prevents duplicate content issues when URLs include UTM parameters or session trackers.',
        severity: SeoPriority.MEDIUM,
      });
    }

    // ── 7. INTERNAL LINKING SIGNALS ──────────────────────────────────────────
    if (clientSignals.internalLinkCount < 3) {
      gaps.push({
        id: 'gap-internal-linking',
        gapType: 'INTERNAL_LINKING_GAP',
        nature: SeoEvidenceNature.FACT,
        title: 'Low Internal Link Connections',
        clientValue: `${clientSignals.internalLinkCount} internal links`,
        competitorComparison: competitorSignals.map((c) => ({
          domain: c.domain,
          value: `${c.signals.internalLinkCount} internal links`,
        })),
        explanation:
          'This landing page has very few internal links connecting visitors to relevant service or product offerings.',
        severity: SeoPriority.LOW,
      });
    }

    return gaps;
  }
}
