import { logger } from '@/shared/observability/logger';
import { createGoogleRateLimitedError, AppError } from '@/shared/errors';

export interface GbpReviewData {
  reviewId: string;
  reviewer: {
    displayName: string;
    isAnonymous?: boolean;
    profilePhotoUrl?: string;
  };
  starRating: 'ONE' | 'TWO' | 'THREE' | 'FOUR' | 'FIVE';
  comment?: string;
  createTime: string;
  updateTime: string;
  reviewReply?: {
    comment: string;
    updateTime: string;
  };
}

export interface ListReviewsResponse {
  reviews?: GbpReviewData[];
  averageRating?: number;
  totalReviewCount?: number;
  nextPageToken?: string;
}

export class GbpWriteClient {
  private static readonly MAX_RETRIES = 3;
  private static readonly BASE_DELAY_MS = 1000;

  private static async executeWithBackoff(
    requestFn: () => Promise<Response>,
    operationName: string
  ): Promise<Response> {
    let attempt = 0;

    while (attempt < this.MAX_RETRIES) {
      try {
        const response = await requestFn();

        if (response.ok) {
          return response;
        }

        if (response.status === 429 || response.status >= 500) {
          attempt++;
          if (attempt >= this.MAX_RETRIES) {
            if (response.status === 429) {
              throw createGoogleRateLimitedError('GBP Reviews API rate limit exceeded after retries.');
            }
            throw new Error(`Google API error (${response.status}) on ${operationName}: ${await response.text()}`);
          }

          const retryAfter = response.headers.get('Retry-After');
          const delayMs = retryAfter
            ? parseInt(retryAfter, 10) * 1000
            : this.BASE_DELAY_MS * Math.pow(2, attempt) + Math.random() * 500; // Exponential backoff with jitter

          logger.warn(
            { operationName, status: response.status, attempt, delayMs },
            'Retrying Google API request'
          );
          await new Promise((resolve) => setTimeout(resolve, delayMs));
          continue;
        }

        // Return 4xx errors immediately without retry
        return response;
      } catch (error) {
        attempt++;
        if (attempt >= this.MAX_RETRIES) {
          throw error;
        }
        const delayMs = this.BASE_DELAY_MS * Math.pow(2, attempt) + Math.random() * 500;
        logger.warn(
          { operationName, err: error, attempt, delayMs },
          'Network error during Google API request, retrying'
        );
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }

    throw new Error('Unreachable: backoff loop exited unexpectedly.');
  }

  private static async handleResponse<T>(response: Response, operationName: string): Promise<T> {
    if (!response.ok) {
      const errText = await response.text();
      let errorJson;
      try {
        errorJson = JSON.parse(errText);
      } catch {
        errorJson = { message: errText };
      }
      logger.error({ status: response.status, errorJson }, `GBP Write API failed: ${operationName}`);
      throw new AppError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Google API error: ${errorJson.error?.message || errorJson.message || 'Unknown error'}`,
        statusCode: response.status
      });
    }

    // DELETE requests may return empty bodies or 204
    if (response.status === 204) {
      return {} as T;
    }

    const text = await response.text();
    return text ? JSON.parse(text) : ({} as T);
  }

  public static async listReviews(
    accessToken: string,
    accountId: string,
    locationId: string,
    pageToken?: string
  ): Promise<ListReviewsResponse> {
    const url = new URL(`https://mybusiness.googleapis.com/v4/accounts/${accountId}/locations/${locationId}/reviews`);
    if (pageToken) {
      url.searchParams.append('pageToken', pageToken);
    }
    // Pull the maximum allowed page size for reviews to speed up sync
    url.searchParams.append('pageSize', '50');

    const response = await this.executeWithBackoff(
      () =>
        fetch(url.toString(), {
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
      'listReviews'
    );

    return this.handleResponse<ListReviewsResponse>(response, 'listReviews');
  }

  public static async updateReply(
    accessToken: string,
    accountId: string,
    locationId: string,
    reviewId: string,
    comment: string
  ): Promise<any> {
    // Review comments cannot exceed 4096 bytes
    const byteLength = Buffer.byteLength(comment, 'utf8');
    if (byteLength > 4096) {
      throw new AppError({
        code: 'VALIDATION_FAILED',
        message: `Review reply exceeds maximum length of 4096 bytes (current: ${byteLength})`,
        statusCode: 400
      });
    }

    const url = `https://mybusiness.googleapis.com/v4/accounts/${accountId}/locations/${locationId}/reviews/${reviewId}/reply`;

    const response = await this.executeWithBackoff(
      () =>
        fetch(url, {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ comment }),
        }),
      'updateReply'
    );

    return this.handleResponse(response, 'updateReply');
  }

  public static async deleteReply(
    accessToken: string,
    accountId: string,
    locationId: string,
    reviewId: string
  ): Promise<void> {
    const url = `https://mybusiness.googleapis.com/v4/accounts/${accountId}/locations/${locationId}/reviews/${reviewId}/reply`;

    const response = await this.executeWithBackoff(
      () =>
        fetch(url, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }),
      'deleteReply'
    );

    await this.handleResponse(response, 'deleteReply');
  }

  // --- PROFILE (Business Information API) ---

  public static async getProfile(
    accessToken: string,
    locationId: string,
    readMask: string = 'name,languageCode,storeCode,title,phoneNumbers,categories,storefrontAddress,websiteUri,regularHours,specialHours,adWordsLocationExtensions,latlng,openInfo,metadata,profile,relationshipData,moreHours,serviceArea,serviceItems'
  ): Promise<any> {
    const url = `https://mybusinessbusinessinformation.googleapis.com/v1/${locationId}?readMask=${readMask}`;
    const response = await this.executeWithBackoff(
      () =>
        fetch(url, {
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
      'getProfile'
    );
    return this.handleResponse(response, 'getProfile');
  }

  public static async updateProfile(
    accessToken: string,
    locationId: string,
    updateMask: string,
    data: any
  ): Promise<any> {
    const url = `https://mybusinessbusinessinformation.googleapis.com/v1/${locationId}?updateMask=${updateMask}`;
    const response = await this.executeWithBackoff(
      () =>
        fetch(url, {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        }),
      'updateProfile'
    );
    return this.handleResponse(response, 'updateProfile');
  }

  // --- POSTS (GBP API v4) ---

  public static async listPosts(
    accessToken: string,
    accountId: string,
    locationId: string
  ): Promise<any> {
    const url = `https://mybusiness.googleapis.com/v4/accounts/${accountId}/locations/${locationId}/localPosts`;
    const response = await this.executeWithBackoff(
      () =>
        fetch(url, {
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
      'listPosts'
    );
    return this.handleResponse(response, 'listPosts');
  }

  public static async createPost(
    accessToken: string,
    accountId: string,
    locationId: string,
    data: any
  ): Promise<any> {
    const url = `https://mybusiness.googleapis.com/v4/accounts/${accountId}/locations/${locationId}/localPosts`;
    const response = await this.executeWithBackoff(
      () =>
        fetch(url, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        }),
      'createPost'
    );
    return this.handleResponse(response, 'createPost');
  }

  public static async deletePost(
    accessToken: string,
    accountId: string,
    locationId: string,
    postId: string
  ): Promise<void> {
    // Note: postId already contains 'localPosts/' prefix if it's the full resource name.
    // If it's just the ID, we need to append it. The API docs say it should be "accounts/{accountId}/locations/{locationId}/localPosts/{localPostId}"
    const cleanPostId = postId.split('/').pop(); 
    const url = `https://mybusiness.googleapis.com/v4/accounts/${accountId}/locations/${locationId}/localPosts/${cleanPostId}`;
    const response = await this.executeWithBackoff(
      () =>
        fetch(url, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
      'deletePost'
    );
    await this.handleResponse(response, 'deletePost');
  }

  // --- MEDIA (GBP API v4) ---

  public static async listMedia(
    accessToken: string,
    accountId: string,
    locationId: string
  ): Promise<any> {
    const url = `https://mybusiness.googleapis.com/v4/accounts/${accountId}/locations/${locationId}/media`;
    const response = await this.executeWithBackoff(
      () =>
        fetch(url, {
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
      'listMedia'
    );
    return this.handleResponse(response, 'listMedia');
  }

  public static async createMedia(
    accessToken: string,
    accountId: string,
    locationId: string,
    data: any
  ): Promise<any> {
    const url = `https://mybusiness.googleapis.com/v4/accounts/${accountId}/locations/${locationId}/media`;
    const response = await this.executeWithBackoff(
      () =>
        fetch(url, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        }),
      'createMedia'
    );
    return this.handleResponse(response, 'createMedia');
  }

  public static async deleteMedia(
    accessToken: string,
    accountId: string,
    locationId: string,
    mediaKey: string
  ): Promise<void> {
    const cleanMediaKey = mediaKey.split('/').pop();
    const url = `https://mybusiness.googleapis.com/v4/accounts/${accountId}/locations/${locationId}/media/${cleanMediaKey}`;
    const response = await this.executeWithBackoff(
      () =>
        fetch(url, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
      'deleteMedia'
    );
    await this.handleResponse(response, 'deleteMedia');
  }

  // --- VERIFICATIONS (Business Profile API) ---

  public static async getVerificationState(
    accessToken: string,
    locationId: string
  ): Promise<any> {
    const url = `https://mybusinessverifications.googleapis.com/v1/${locationId}/verifications`;
    const response = await this.executeWithBackoff(
      () =>
        fetch(url, {
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
      'getVerificationState'
    );
    return this.handleResponse(response, 'getVerificationState');
  }
}
