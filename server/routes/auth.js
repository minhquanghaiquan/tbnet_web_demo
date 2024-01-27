const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const path = require("path");
const { pool } = require("../config/dbConfig");

const { OAuth2Client } = require("google-auth-library");

//Google mailer setup
const GOOGLE_MAILER_CLIENT_ID = process.env.GOOGLE_MAILER_CLIENT_ID;
const GOOGLE_MAILER_CLIENT_SECRET = process.env.GOOGLE_MAILER_CLIENT_SECRET;
const GOOGLE_MAILER_REFRESH_TOKEN = process.env.GOOGLE_MAILER_REFRESH_TOKEN;
const ADMIN_EMAIL_ADDRESS = process.env.ADMIN_EMAIL_ADDRESS;

const myOAuth2Client = new OAuth2Client(
  GOOGLE_MAILER_CLIENT_ID,
  GOOGLE_MAILER_CLIENT_SECRET
);
myOAuth2Client.setCredentials({
  refresh_token: GOOGLE_MAILER_REFRESH_TOKEN,
});

//key-token for hash password with jws
const key_token = process.env.KEY_TOKEN;

router.get("/login", (req, res) => {
  const indexPath = path.join(
    __dirname,
    "..",
    "views",
    "partials",
    "login.html"
  );
  res.sendFile(indexPath);
});
router.post("/login", async (req, res) => {
  try {
    var { username, password } = req.body;
    let SQL = "SELECT * FROM users WHERE login_user=$1;";
    const user = await pool.query(SQL, [username]);

    if (user.rows.length === 0)
      return res.status(400).send("Username or password is wrong");

    bcrypt.compare(password, user.rows[0].login_pwd).then((doMatch) => {
      if (doMatch) {
        const token = jwt.sign(
          { login_user: user.rows[0].login_user },
          key_token
        );
        res.json({
          token,
          user: {
            id: user.rows[0].login_user_id,
            email: user.rows[0].login_user,
          },
        });
      } else {
        return res.status(400).json({ error: "Invalid Email or password" });
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

router.get("/forgotpassword", (req, res) => {
  const indexPath = path.join(
    __dirname,
    "..",
    "views",
    "partials",
    "forgotpassword.html"
  );
  res.sendFile(indexPath);
});

router.post("/forgotpassword", (req, res) => {
  crypto.randomBytes(32, async (err, buffer) => {
    if (err) {
      console.log(err);
    }
    const token = buffer.toString("hex");
    console.log(req.body.emailUser);
    console.log(token);

    let SQL_select = "SELECT * FROM users WHERE login_user=$1;";
    const user = await pool.query(SQL_select, [req.body.emailUser]);

    let SQL = `UPDATE "users" 
                    SET "reset_token" = $1 ,"expire_token" = $2
                    WHERE "login_user" = $3`;
    await pool.query(SQL, [token, Date.now() + 3600000, req.body.emailUser]);

    const myAccessTokenObject = await myOAuth2Client.getAccessToken();
    const myAccessToken = myAccessTokenObject?.token;

    const transport = nodemailer.createTransport({
      service: "gmail",
      auth: {
        type: "OAuth2",
        user: ADMIN_EMAIL_ADDRESS,
        clientId: GOOGLE_MAILER_CLIENT_ID,
        clientSecret: GOOGLE_MAILER_CLIENT_SECRET,
        refresh_token: GOOGLE_MAILER_REFRESH_TOKEN,
        accessToken: myAccessToken,
      },
    });

    const mailOptions = {
      to: user.rows[0].login_user, // Gửi đến ai?
      subject: "Reset password - TBNET-WEB", // Tiêu đề email
      html: `
              <p>You requested for password reset</p>
              <h3>Click in this <a href="http://178.128.113.184:8081/auth/reset/${token}">link</a> to reset password</h3>
              `,
    };
    await transport.sendMail(mailOptions);
    res.json({ message: "check your email" });
  });
});

router.get("/reset/:tokenreset", (req, res) => {
  const indexPath = path.join(
    __dirname,
    "..",
    "views",
    "partials",
    "resetpassword.html"
  );
  res.sendFile(indexPath);
});

router.post("/new-password", async (req, res) => {
  try {
    const newPassword = req.body.password;
    const sentToken = req.body.token;
    const hashedpassword = await bcrypt.hash(newPassword, 12);

    let SQL_user =
      "SELECT * FROM users WHERE reset_token=$1 AND expire_token>$2;";
    const user = await pool.query(SQL_user, [sentToken, Date.now()]);

    let SQL =
      "UPDATE users SET login_pwd=$1 ,reset_token=$2 ,expire_token=$3 WHERE reset_token=$4 AND expire_token>$5";

    await pool.query(SQL, [hashedpassword, "", 0, sentToken, Date.now()]);

    if (user.rows.length !== 0) {
      res.json({ message: "password updated success" });
    }
  } catch (error) {
    console.error("Error during password update:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

module.exports = router;
