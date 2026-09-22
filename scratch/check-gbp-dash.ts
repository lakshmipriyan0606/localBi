import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const connection = await prisma.userConnection.findFirst({
    where: {
      externalEmail: 'lakshmipriyan0606@gmail.com',
      provider: 'GOOGLE',
    },
    include: {
      credentials: true,
    }
  });

  if (!connection) {
    console.log("No connection found");
    return;
  }

  const token = connection.credentials[0]?.accessToken;
  if (!token) {
    console.log("No token found");
    return;
  }

  console.log("Token:", token.substring(0, 10) + "...");

  const locRes = await fetch(
    `https://mybusinessbusinessinformation.googleapis.com/v1/accounts/-/locations?readMask=name,title,storeCode,storefrontAddress,metadata`,
    { headers: { Authorization: `Bearer ${token}` } },
  );

  if (!locRes.ok) {
    console.log("Failed:", locRes.status, await locRes.text());
    return;
  }

  const data = await locRes.json();
  console.log("Locations found:", JSON.stringify(data, null, 2));
}

main().catch(console.error);
