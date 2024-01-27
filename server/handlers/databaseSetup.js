const { pool } = require("../config/dbConfig");

const initializeDatabase = async () => {
  // Khởi tạo cơ sở dữ liệu và các bảng
  await pool.query(process.env.CREATE_DEVICE);
  await pool.query(process.env.CREATE_DEVICE_DATA);
  await pool.query(process.env.CREATE_USERS);
  await pool.query(process.env.CREATE_INF_OTA);
  await pool.query(process.env.CREATE_ERRORS_TABLE);
};

module.exports = { initializeDatabase };
