// db.js
const { Pool } = require("pg");

const pool = new Pool({
  user: "postgres",
  host: "178.128.113.184",
  database: "tbnet_smartsite",
  password: "123456",
  port: 5432,
});

module.exports = { pool };
