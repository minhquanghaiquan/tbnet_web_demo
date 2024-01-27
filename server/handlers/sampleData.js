const { pool } = require("../config/dbConfig");

const addSampleData = async () => {
  let SQL1 = "SELECT * FROM users WHERE login_user=$1;";
  const check_user = await pool.query(SQL1, ["minhquangbvmi@gmail.com"]);
  // console.log(check_user);
  if (check_user.rows.length == 0) {
    var SQL2 = "INSERT INTO users (login_user , login_pwd ) VALUES ($1 , $2 );";
    await pool.query(SQL2, ["minhquangbvmi@gmail.com", "123456789"]);
  }

  let SQL3 = "SELECT * FROM device WHERE device_id=$1;";
  const check_device1 = await pool.query(SQL3, ["HTP001"]);
  const check_device2 = await pool.query(SQL3, ["HTP002"]);
  const check_device3 = await pool.query(SQL3, ["CTOM28"]);
  const check_device4 = await pool.query(SQL3, ["CTNK74"]);

  if (check_device1.rows.length == 0) {
    var SQL4 =
      "INSERT INTO device (device_id , address, status ) VALUES  ($1 , $2, $3 );";
    await pool.query(SQL4, [
      "HTP001",
      "Hồ Chí Minh, Tân Phú, 212 Lê Trọng Tấn",
      1,
    ]);
  }
  if (check_device2.rows.length == 0) {
    var SQL5 =
      "INSERT INTO device (device_id , address, status ) VALUES ($1 , $2 , $3);";
    await pool.query(SQL5, [
      "HTP002",
      "Hồ Chí Minh, Tân Phú, 2 Bờ Bao Tân Thắng",
      1,
    ]);
  }
  if (check_device3.rows.length == 0) {
    var SQL6 =
      "INSERT INTO device (device_id , address, status ) VALUES ($1 , $2 , $3);";
    await pool.query(SQL6, ["CTOM28", "Cần Thơ, Ô Môn", 1]);
  }
  if (check_device4.rows.length == 0) {
    var SQL7 =
      "INSERT INTO device (device_id , address, status ) VALUES ($1 , $2 , $3);";
    await pool.query(SQL7, ["CTNK74", "Cần Thơ, Ninh Kiều", 1]);
  }
};

module.exports = { addSampleData };
