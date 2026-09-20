import pkg from 'pg';
const { Client } = pkg;

async function main() {
  const client = new Client({
    connectionString: 'postgresql://localbi_migrator:8c64a30a649493b0796970d65bdde5e7@127.0.0.1:5432/localbi',
  });
  await client.connect();

  const properties = await client.query('SELECT * FROM "GscProperty"');
  console.log('GSC Properties:', properties.rows);

  const connections = await client.query('SELECT * FROM "IntegrationConnection"');
  console.log('Connections:', connections.rows);

  const ext = await client.query(`SELECT * FROM "ExternalResource" WHERE "resourceType" = 'PROPERTY'`);
  console.log('External Resources:', ext.rows);

  await client.end();
}

main().catch(console.error);
