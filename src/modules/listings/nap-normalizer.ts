/**
 * NAP (Name, Address, Phone) Normalizer
 * Standardizes business identification fields across providers for accurate
 * consistency comparison, preventing false-positive mismatches from formatting differences.
 */

export class NapNormalizer {
  /**
   * Normalizes a phone number to standard digits.
   * Strips country codes (+91, +1, etc.), spaces, brackets, hyphens, and leading zeros.
   * For Indian 10-digit numbers, standardizes to 10 digits.
   */
  public static normalizePhone(phone: string | null | undefined): string {
    if (!phone) return '';

    // Strip all non-digit characters except leading plus
    let cleaned = phone.trim().replace(/[^\d+]/g, '');

    // Handle standard international country codes
    if (cleaned.startsWith('+91')) {
      cleaned = cleaned.substring(3);
    } else if (cleaned.startsWith('0091')) {
      cleaned = cleaned.substring(4);
    } else if (cleaned.startsWith('+1')) {
      cleaned = cleaned.substring(2);
    } else if (cleaned.startsWith('+')) {
      cleaned = cleaned.substring(1);
    }

    // Strip leading trunk zero (common in Indian/UK landlines: e.g. 044, 09876543210)
    if (cleaned.startsWith('0') && cleaned.length > 10) {
      cleaned = cleaned.replace(/^0+/, '');
    }

    // Strip any remaining non-digit characters
    cleaned = cleaned.replace(/\D/g, '');

    // If Indian 11 digits starting with 91, take last 10
    if (cleaned.length === 12 && cleaned.startsWith('91')) {
      cleaned = cleaned.substring(2);
    }

    return cleaned;
  }

  /**
   * Checks whether two phone numbers are equivalent.
   * Compares normalized representations.
   */
  public static arePhonesEquivalent(phoneA: string | null | undefined, phoneB: string | null | undefined): boolean {
    const normA = this.normalizePhone(phoneA);
    const normB = this.normalizePhone(phoneB);

    if (!normA || !normB) return false;

    // Exact normalized match
    if (normA === normB) return true;

    // Suffix match for 10-digit mobile/landline numbers
    if (normA.length >= 10 && normB.length >= 10) {
      return normA.slice(-10) === normB.slice(-10);
    }

    return false;
  }

  /**
   * Normalizes a business name:
   * - Lowercase
   * - Strips legal entity forms (Pvt Ltd, LLC, Inc, etc.)
   * - Strips standard punctuation and extra spaces
   */
  public static normalizeName(name: string | null | undefined): string {
    if (!name) return '';

    let cleaned = name.toLowerCase().trim();

    // Remove common business entity suffixes
    const suffixPatterns = [
      /\b(private\s+limited|pvt\.?\s*ltd\.?|pvt\s+ltd|ltd\.?|limited)\b/gi,
      /\b(incorporated|inc\.?|corporation|corp\.?|llc|llp|co\.?|company)\b/gi,
      /\b(branch|store|outlet|franchise)\b/gi,
    ];

    for (const pat of suffixPatterns) {
      cleaned = cleaned.replace(pat, ' ');
    }

    // Remove punctuation
    cleaned = cleaned.replace(/['".,\/#!$%\^&\*;:{}=\-_`~()]/g, ' ');

    // Normalize whitespace
    return cleaned.replace(/\s+/g, ' ').trim();
  }

  /**
   * Computes Jaccard/token similarity between two normalized names.
   * Returns a score between 0.0 and 1.0.
   */
  public static compareNames(nameA: string | null | undefined, nameB: string | null | undefined): number {
    const normA = this.normalizeName(nameA);
    const normB = this.normalizeName(nameB);

    if (!normA || !normB) return 0;
    if (normA === normB) return 1.0;

    const tokensA = new Set(normA.split(' ').filter(t => t.length > 1));
    const tokensB = new Set(normB.split(' ').filter(t => t.length > 1));

    if (tokensA.size === 0 || tokensB.size === 0) return 0;

    let intersection = 0;
    for (const t of tokensA) {
      if (tokensB.has(t)) intersection++;
    }

    const union = new Set([...tokensA, ...tokensB]).size;
    return union > 0 ? intersection / union : 0;
  }

  /**
   * Normalizes an address string:
   * - Standardizes street type abbreviations (St -> Street, Rd -> Road, etc.)
   * - Strips punctuation
   * - Normalizes spaces and casing
   */
  public static normalizeAddress(address: string | null | undefined): string {
    if (!address) return '';

    let cleaned = address.toLowerCase().trim();

    const abbreviations: Array<[RegExp, string]> = [
      [/\b(rd\.?|road)\b/gi, 'road'],
      [/\b(st\.?|street)\b/gi, 'street'],
      [/\b(ave\.?|avenue)\b/gi, 'avenue'],
      [/\b(blvd\.?|boulevard)\b/gi, 'boulevard'],
      [/\b(dr\.?|drive)\b/gi, 'drive'],
      [/\b(ln\.?|lane)\b/gi, 'lane'],
      [/\b(fl\.?|flr\.?|floor)\b/gi, 'floor'],
      [/\b(ste\.?|suite)\b/gi, 'suite'],
      [/\b(apt\.?|apartment)\b/gi, 'apartment'],
      [/\b(plz\.?|plaza)\b/gi, 'plaza'],
      [/\b(sq\.?|square)\b/gi, 'square'],
      [/\b(hwy\.?|highway)\b/gi, 'highway'],
      [/\b(opp\.?|opposite)\b/gi, 'opposite'],
      [/\b(nr\.?|near)\b/gi, 'near'],
      [/\b(bldg\.?|building)\b/gi, 'building'],
      [/\b(salai)\b/gi, 'salai'],
      [/\b(nagar)\b/gi, 'nagar'],
    ];

    for (const [regex, replacement] of abbreviations) {
      cleaned = cleaned.replace(regex, replacement);
    }

    // Strip punctuation
    cleaned = cleaned.replace(/[,.#\-\/]/g, ' ');

    return cleaned.replace(/\s+/g, ' ').trim();
  }

  /**
   * Compares two addresses and returns token overlap score (0.0 to 1.0).
   */
  public static compareAddresses(addrA: string | null | undefined, addrB: string | null | undefined): number {
    const normA = this.normalizeAddress(addrA);
    const normB = this.normalizeAddress(addrB);

    if (!normA || !normB) return 0;
    if (normA === normB) return 1.0;

    const tokensA = new Set(normA.split(' ').filter(t => t.length > 1));
    const tokensB = new Set(normB.split(' ').filter(t => t.length > 1));

    if (tokensA.size === 0 || tokensB.size === 0) return 0;

    let intersection = 0;
    for (const t of tokensA) {
      if (tokensB.has(t)) intersection++;
    }

    const union = new Set([...tokensA, ...tokensB]).size;
    return union > 0 ? intersection / union : 0;
  }

  /**
   * Normalizes website URL:
   * - Strips protocol (http://, https://)
   * - Strips www. prefix
   * - Strips trailing slashes
   * - Strips query parameters (utm_*, ref, etc.)
   * - Strips hash fragments
   */
  public static normalizeWebsite(url: string | null | undefined): string {
    if (!url) return '';

    let cleaned = url.trim().toLowerCase();

    // Strip protocol
    cleaned = cleaned.replace(/^https?:\/\//, '');

    // Strip www.
    cleaned = cleaned.replace(/^www\./, '');

    // Strip query strings and hash
    cleaned = cleaned.split('?')[0].split('#')[0];

    // Strip trailing slashes
    cleaned = cleaned.replace(/\/+$/, '');

    return cleaned;
  }

  /**
   * Checks whether two website URLs point to the same page or domain.
   */
  public static areWebsitesEquivalent(urlA: string | null | undefined, urlB: string | null | undefined): boolean {
    const normA = this.normalizeWebsite(urlA);
    const normB = this.normalizeWebsite(urlB);

    if (!normA || !normB) return false;
    if (normA === normB) return true;

    // Subdirectory vs root check: e.g. "brand.com/store1" vs "brand.com"
    return normA.startsWith(normB) || normB.startsWith(normA);
  }

  /**
   * Normalizes time strings to "HH:MM" (24-hour format).
   */
  public static normalizeTime(timeStr: string | null | undefined): string | null {
    if (!timeStr) return null;
    const trimmed = timeStr.trim();

    // Matches "14:30"
    if (/^\d{2}:\d{2}$/.test(trimmed)) {
      return trimmed;
    }

    // Matches "9:30" -> "09:30"
    if (/^\d{1}:\d{2}$/.test(trimmed)) {
      return `0${trimmed}`;
    }

    // Matches "09:30:00" -> "09:30"
    if (/^\d{2}:\d{2}:\d{2}$/.test(trimmed)) {
      return trimmed.substring(0, 5);
    }

    // Matches "9:30 AM" or "09:30 PM"
    const ampmMatch = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (ampmMatch) {
      let hours = parseInt(ampmMatch[1], 10);
      const minutes = ampmMatch[2];
      const meridiem = ampmMatch[3].toUpperCase();

      if (meridiem === 'PM' && hours < 12) hours += 12;
      if (meridiem === 'AM' && hours === 12) hours = 0;

      return `${hours.toString().padStart(2, '0')}:${minutes}`;
    }

    return trimmed;
  }
}
