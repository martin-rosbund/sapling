require('dotenv').config();
const { Client } = require('pg');
const bcrypt = require('bcrypt');

(async () => {
  const client = new Client({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 5432),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME,
  });

  await client.connect();

  const result = await client.query(
    "select handle, first_name, last_name, login_name, login_password from person_item where login_name in ('max-mustermann', 'max', 'lisa', 'lisa-musterfrau') order by handle asc"
  );

  for (const row of result.rows) {
    const checks = {
      loginNameAsPassword: await bcrypt.compare(row.login_name, row.login_password),
      max: await bcrypt.compare('max', row.login_password),
      maxMustermann: await bcrypt.compare('max-mustermann', row.login_password),
      lisa: await bcrypt.compare('lisa', row.login_password),
      lisaMusterfrau: await bcrypt.compare('lisa-musterfrau', row.login_password),
    };

    console.log(
      JSON.stringify(
        {
          handle: row.handle,
          loginName: row.login_name,
          firstName: row.first_name,
          lastName: row.last_name,
          hashPrefix: String(row.login_password).slice(0, 4),
          checks,
        },
        null,
        2,
      ),
    );
  }

  if (result.rows.length === 0) {
    console.log('NO_MATCHING_USERS');
  }

  await client.end();
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
