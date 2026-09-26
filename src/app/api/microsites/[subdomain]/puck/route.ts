import { NextRequest, NextResponse } from 'next/server';
import { PuckService } from '@/modules/microsites/puck-service';

export async function GET(
  _req: NextRequest,
  segmentData: { params: Promise<{ subdomain: string }> }
) {
  try {
    const { subdomain } = await segmentData.params;
    const data = await PuckService.getPuckData(subdomain);
    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error fetching puck data:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  segmentData: { params: Promise<{ subdomain: string }> }
) {
  try {
    const { subdomain } = await segmentData.params;
    const body = await req.json();
    const { data } = body;

    if (!data) {
      return NextResponse.json({ error: 'Missing puck layout data' }, { status: 400 });
    }

    await PuckService.savePuckData(subdomain, data);
    return NextResponse.json({ success: true, message: 'Layout published to subdomain!' });
  } catch (error) {
    console.error('Error saving puck data:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
