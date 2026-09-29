const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://localbi_app:336708f578e382a4af18f95148be5753@127.0.0.1:5432/localbi?schema=public',
});

client.connect()
  .then(() => client.query('SELECT * FROM external_resources'))
  .then(res => {
    console.log(res.rows);
    client.end();
  })
  .catch(err => {
    console.error(err);
    client.end();
  });
