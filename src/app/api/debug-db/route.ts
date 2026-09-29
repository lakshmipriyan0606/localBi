import { NextResponse } from 'next/server';
import { prisma } from '@/shared/database/client';

export async function GET() {
  const tenants = await prisma.tenant.findMany();
  const connections = await prisma.integrationConnection.findMany();
  const mappings = await prisma.internalResourceMapping.findMany();
  const resources = await prisma.externalResource.findMany();
  return NextResponse.json({ tenants, connections, mappings, resources });
}
