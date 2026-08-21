const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.POSTGRES_USER || 'admin',
  host: process.env.POSTGRES_HOST || 'db',
  database: process.env.POSTGRES_DB || 'topfotosdb',
  password: process.env.POSTGRES_PASSWORD || 'senhaforte123',
  port: process.env.POSTGRES_PORT || 5432,
});

module.exports = pool;
