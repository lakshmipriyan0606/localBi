import { NextRequest, NextResponse } from 'next/server';
import { RegistrationService } from '@/modules/auth/registration-service';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug') || '';

  if (!slug || slug.length < 2) {
    return NextResponse.json({ available: false, reason: 'too_short' });
  }

  const available = await RegistrationService.isSlugAvailable(slug);
  const reason = available ? null : 'taken';

  return NextResponse.json({ available, slug, reason });
}
