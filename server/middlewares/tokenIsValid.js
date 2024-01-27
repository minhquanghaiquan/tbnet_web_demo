const jwt = require("jsonwebtoken");
const { pool } = require("../config/dbConfig");
const key_token = process.env.KEY_TOKEN;

const tokenIsValid = async (req, res, next) => {
  try {
    const token = req.header("auth-token");

    if (!token) return res.json(false);

    const verified = jwt.verify(token, key_token);
    if (!verified) return res.json(false);

    let SQL = "SELECT * FROM users WHERE login_user=$1;";
    const user = await pool.query(SQL, [verified.login_user]);

    if (user.rows.length == 0) return res.json(false);
    return next();
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: err.message });
  }
};

module.exports = tokenIsValid;
