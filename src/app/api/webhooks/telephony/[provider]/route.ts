import { NextRequest, NextResponse } from 'next/server';
import { CallIngestionService } from '@/modules/telephony/call-ingestion-service';
import { handleRouteError } from '@/shared/errors';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  try {
    const { provider } = await params;
    const contentType = request.headers.get('content-type') || '';

    let rawPayload: Record<string, any> = {};

    if (contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await request.formData();
      formData.forEach((value, key) => {
        rawPayload[key] = value.toString();
      });
    } else {
      try {
        rawPayload = await request.json();
      } catch {
        rawPayload = {};
      }
    }

    // Convert headers to plain dictionary
    const headers: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      headers[key.toLowerCase()] = value;
    });

    const signature =
      headers['x-telephony-signature'] ||
      headers['x-test-signature'] ||
      headers['x-twilio-signature'] ||
      '';

    const result = await CallIngestionService.processWebhook({
      providerName: provider,
      rawPayload,
      signature,
      headers,
      url: request.url,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return handleRouteError(error);
  }
}
