import { NextResponse } from 'next/server';
import { prisma } from '@/shared/database/client';

export async function GET() {
  const tenant = await prisma.tenant.findUnique({ where: { slug: 'lakshmi-food' } });
  if (!tenant) return NextResponse.json({ error: 'no tenant' });
  
  const connections = await prisma.integrationConnection.findMany({ where: { tenantId: tenant.id } });
  const mappings = await prisma.internalResourceMapping.findMany({ where: { tenantId: tenant.id } });
  const resources = await prisma.externalResource.findMany({ where: { tenantId: tenant.id } });
  
  return NextResponse.json({ tenant, connections, mappings, resources });
}
