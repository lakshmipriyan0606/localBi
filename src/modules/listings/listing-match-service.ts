import {
  CanonicalStoreProfile,
  ProviderListingSnapshot,
  MatchEvaluationResult,
  MatchConfidence,
  MatchStatus,
} from './listing-types';
import { NapNormalizer } from './nap-normalizer';

export class ListingMatchService {
  /**
   * Calculates the Haversine distance in meters between two lat/lng points.
   */
  public static calculateDistanceMeters(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371e3; // Earth radius in meters
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
    const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
      Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Evaluates match confidence between a canonical store profile and a provider listing snapshot.
   */
  public static evaluateMatch(
    canonical: CanonicalStoreProfile,
    snapshot: ProviderListingSnapshot
  ): MatchEvaluationResult {
    const evidence: string[] = [];
    let score = 0.0;

    // 1. Google Place ID Match (Strongest direct identity signal)
    let placeIdMatched = false;
    const snapshotPlaceId = (snapshot.extra as any)?.placeId || snapshot.externalListingId;
    if (canonical.googlePlaceId && snapshotPlaceId && canonical.googlePlaceId === snapshotPlaceId) {
      placeIdMatched = true;
      score += 0.5;
      evidence.push('Direct Place ID match');
    }

    // 2. Phone Comparison
    let phoneMatched = false;
    let phoneConflict = false;
    if (canonical.phone && snapshot.phone) {
      phoneMatched = NapNormalizer.arePhonesEquivalent(canonical.phone, snapshot.phone);
      if (phoneMatched) {
        score += 0.35;
        evidence.push(`Phone numbers match (${canonical.phone})`);
      } else {
        phoneConflict = true;
        score -= 0.3;
        evidence.push(`Phone mismatch: canonical (${canonical.phone}) vs provider (${snapshot.phone})`);
      }
    } else if (!snapshot.phone && canonical.phone) {
      evidence.push('Provider phone missing');
    }

    // 3. Name Similarity
    const nameSimilarity = NapNormalizer.compareNames(canonical.name, snapshot.name);
    if (nameSimilarity >= 0.8) {
      score += 0.25;
      evidence.push(`High name similarity (${Math.round(nameSimilarity * 100)}%)`);
    } else if (nameSimilarity >= 0.5) {
      score += 0.15;
      evidence.push(`Moderate name similarity (${Math.round(nameSimilarity * 100)}%)`);
    } else if (snapshot.name) {
      score -= 0.2;
      evidence.push(`Low name similarity (${Math.round(nameSimilarity * 100)}%)`);
    }

    // 4. Address Similarity
    const canonicalFullAddress = `${canonical.addressLine1} ${canonical.city} ${canonical.postalCode}`;
    const addressSimilarity = NapNormalizer.compareAddresses(canonicalFullAddress, snapshot.address);
    if (addressSimilarity >= 0.7) {
      score += 0.25;
      evidence.push(`High address similarity (${Math.round(addressSimilarity * 100)}%)`);
    } else if (addressSimilarity >= 0.4) {
      score += 0.15;
      evidence.push(`Moderate address similarity (${Math.round(addressSimilarity * 100)}%)`);
    } else if (snapshot.address) {
      evidence.push(`Low address similarity (${Math.round(addressSimilarity * 100)}%)`);
    }

    // 5. Geographic Distance (if available in extra coordinates)
    let distanceMeters: number | null = null;
    const snapLat = (snapshot.extra as any)?.latitude;
    const snapLng = (snapshot.extra as any)?.longitude;
    if (
      canonical.latitude != null &&
      canonical.longitude != null &&
      snapLat != null &&
      snapLng != null
    ) {
      distanceMeters = this.calculateDistanceMeters(
        canonical.latitude,
        canonical.longitude,
        snapLat,
        snapLng
      );

      if (distanceMeters < 150) {
        score += 0.2;
        evidence.push(`Nearby location (${Math.round(distanceMeters)}m)`);
      } else if (distanceMeters < 500) {
        score += 0.1;
        evidence.push(`Within 500m (${Math.round(distanceMeters)}m)`);
      } else if (distanceMeters > 3000) {
        score -= 0.3;
        evidence.push(`Far distance (${(distanceMeters / 1000).toFixed(1)}km)`);
      }
    }

    // Normalize final score between 0.0 and 1.0
    const finalScore = Math.max(0, Math.min(1.0, score));

    // Determine Confidence
    let confidence: typeof MatchConfidence[keyof typeof MatchConfidence] = MatchConfidence.LOW;
    if (finalScore >= 0.8) {
      confidence = MatchConfidence.HIGH;
    } else if (finalScore >= 0.5) {
      confidence = MatchConfidence.MEDIUM;
    }

    // Determine Status
    let status: typeof MatchStatus[keyof typeof MatchStatus] = MatchStatus.NO_MATCH;

    // Ambiguous condition: name matches well but phone or location has severe conflict
    if (nameSimilarity >= 0.7 && (phoneConflict || (distanceMeters != null && distanceMeters > 2000))) {
      status = MatchStatus.AMBIGUOUS;
      confidence = MatchConfidence.MEDIUM;
    } else if (finalScore >= 0.8 && !phoneConflict) {
      status = MatchStatus.MATCHED;
    } else if (finalScore >= 0.5) {
      status = MatchStatus.POSSIBLE_MATCH;
    }

    return {
      status,
      confidence,
      score: finalScore,
      evidenceSummary: evidence.join('; '),
      phoneMatched,
      addressSimilarity,
      nameSimilarity,
      distanceMeters,
      placeIdMatched,
    };
  }
}
