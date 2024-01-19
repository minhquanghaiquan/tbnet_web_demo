require("dotenv").config();
const express = require("express");
const app = express();
const server = require("http").createServer(app);
const path = require("path");
const sql = require("sql");
const io = require("socket.io")(server, {
  cors: {
    origin: "*",
  },
});
const mqtt = require("mqtt");
const cors = require("cors");
var bodyParser = require("body-parser");
const fileUpload = require("express-fileupload");
const AdmZip = require("adm-zip");
const md5 = require("md5");

//token-id
const crypto = require("crypto");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const shortId = require("shortid");

//require db
// const mongoose = require("mongoose");
// const mongodb = require("mongodb");
// const stations = require("./models/stationsModel");
// const listStations = require("./models/listStationsModel");
// const users = require("./models/userModel");

//require postgresql
const { Pool } = require("pg");
const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "tbnet_smartsite",
  password: "123456",
  port: 5432,
});

//require service mail
const { OAuth2Client } = require("google-auth-library");
const nodemailer = require("nodemailer");

//app.use
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cors());
app.options("*", cors());
app.use("/public", express.static(__dirname + "/public"));

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

//mongodb - port server
const port_server = process.env.PORT_SERVER;
// const host_mongodb = process.env.HOST_MONGODB;

//mqtt broker
const topic_mqtt = process.env.TOPIC_MQTT;
const username_mqtt = process.env.USERNAME_MQTT;
const password_mqtt = process.env.PASSWORD_MQTT;
const clientId_mqtt = process.env.CLIENT_ID_MQTT;
const client = mqtt.connect(process.env.HOST_MQTT, {
  clientId: clientId_mqtt,
  username: username_mqtt,
  password: password_mqtt,
  clean: true,
});

//Create server
server.listen(port_server, async () => {
  console.log(`Example server listening on port ${port_server}`);
  // const result = await pool.query(process.env.CREATE_USERS);
  await pool.query(process.env.CREATE_DEVICE);
  await pool.query(process.env.CREATE_DEVICE_DATA);
  await pool.query(process.env.CREATE_USERS);
  await pool.query(process.env.CREATE_INF_OTA);

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
});

//Connect to MQTT broker
client.on("connect", async () => {
  console.log("MQTT connected");
  client.subscribe(topic_mqtt);
});

client.on("message", async (topic_mqtt, message) => {
  var data = message.toString();
  data = JSON.parse(data);
  console.log(data);
  try {
    if (data.header.version) {
      const ColumsDeviceData = () => {
        let columnsInsert = ["id", "device_id"];
        for (var i = 0; i < 997; i++) {
          columnsInsert.push("s" + i);
        }
        columnsInsert.push("created_at");
        return columnsInsert;
      };

      let device_data = sql.define({
        name: "device_data",
        columns: ColumsDeviceData(),
      });

      let data_insert = {};
      for (var i = 0; i < 996; i++) {
        data_insert["s" + i] = data.payload["s" + i];
      }
      console.log(data_insert);
      data_insert.device_id = data.header.serial_number;
      let query = device_data.insert([data_insert]).returning("*").toQuery();
      await pool.query(query);

      var topic_mqtt_device = data.header.serial_number + "/control";

      sendDataToClient(topic_mqtt_device, data);
    }
  } catch (error) {
    console.log(error);
  }
});

// Connect to client by socket io ORDER BY created_at DESC
io.on("connection", (clientWeb) => {
  clientWeb.on("CurrentControl", async (data) => {
    console.log(data);
    let SQL =
      "UPDATE device_data SET " +
      data.key +
      "= $1 WHERE device_id = $2 AND id = (SELECT MAX(id) FROM device_data WHERE device_id = $3);";
    await pool.query(SQL, [data.value, data.device_id, data.device_id]);
    sendToDevice(data.device_id + "/control", data);
  });
});

//Function
sendDataToClient = async (topic, msg) => {
  io.emit(topic, msg);
};

sendToDevice = async (topic, message) => {
  let data = JSON.stringify(message);
  console.log(topic);
  console.log(data);
  await client.publish(topic, data);
};

setInterval(() => {
  sendDataToClient("time", new Date().toTimeString());
});

tokenIsValid = async (req, res, next) => {
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

//REST API
app.get("/", async (req, res) => {
  res.sendFile(__dirname + "/public/index.html");
});

app.get("/stations", tokenIsValid, async (req, res) => {
  let SQL = "SELECT * FROM device;";
  const user = await pool.query(SQL);
  return res.status(200).json(user.rows);
});

app.get("/stations/:device_id", tokenIsValid, async (req, res) => {
  var device_id = req.params.device_id;

  let SQL1 =
    "SELECT * FROM public.device_data WHERE device_id=$1 ORDER BY created_at DESC;";
  const device_data = await pool.query(SQL1, [device_id]);
  var lastValue = device_data.rows[0];

  // let SQL2 = "SELECT * FROM device WHERE device_id=$1;";
  // const device = await pool.query(SQL2, [device_id]);

  // var status_currentcontrol = device.rows[0].status;
  return res.status(200).json({ lastValue });
});

// app.get("/login", (req, res) => {
//   console.log("login");
//   res.sendFile(__dirname + "/public/login.html");
// });

app.post("/login", async (req, res) => {
  var { username, password } = req.body;
  let SQL = "SELECT * FROM users WHERE login_user=$1;";
  const user = await pool.query(SQL, [username]);
  if (user.rows.length === 0)
    return res.status(400).send("Username or password is wrong");
  //ss
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
});

app.post("/auth/forgotpassword", (req, res) => {
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
          <h3>Click in this <a href="http://178.128.113.184:8081/reset/${token}">link</a> to reset password</h3>
          `,
    };
    await transport.sendMail(mailOptions);
    res.json({ message: "check your email" });
  });
});

app.get("/reset/:tokenreset", (req, res) => {
  var link = path.join(__dirname);
  console.log(link);
  res.sendFile(__dirname + "/public/resetpassword.html");
});

app.post("/new-password", async (req, res) => {
  const newPassword = req.body.password;
  const sentToken = req.body.token;
  const hashedpassword = await bcrypt.hash(newPassword, 12);

  let SQL_user =
    "SELECT * FROM users WHERE reset_token=$1 AND expire_token>$2;";
  const user = await pool.query(SQL_user, [sentToken, Date.now()]);
  console.log(user.rows);

  let SQL =
    "UPDATE users SET login_pwd=$1 ,reset_token=$2 ,expire_token=$3 WHERE reset_token=$4 AND expire_token>$5";

  await pool.query(SQL, [hashedpassword, "", 0, sentToken, Date.now()]);

  if (user.rows.length !== 0) {
    res.json({ message: "password updated success" });
  }
});

app.post("/getserial", async (req, res) => {
  if (req.body.model) {
    console.log(req.body);
    var { model } = req.body;
    var device_id = "A" + Date.now();
    var SQL = "INSERT INTO device (device_id , model ) VALUES ($1 , $2);";
    await pool.query(SQL, [device_id, model]);
    res.json({ device_id, model });
  } else {
    res.json("Send your name of model");
  }
});

//upload and download
app.get("/ota", (req, res) => {
  res.sendFile(__dirname + "/public/ota.html");
});

// Decrypting text
function decrypt(encryptedData) {
  const password = "tbnet_host_key_password_checkqe";
  const iv = Buffer.alloc(16);
  let data = crypto.createHash("sha256").update(password).digest("hex");
  let encryptedText = Buffer.from(encryptedData, "hex");
  let decipher = crypto.createDecipheriv(
    "aes-256-cbc",
    Buffer.from(data, "hex"),
    iv
  );
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}

// Passing fileUpload as a middleware
app.use(fileUpload());
// For handling the upload request
app.post("/upload_mcc", function (req, res) {
  if (req.files && Object.keys(req.files).length !== 0) {
    const uploadedFile = req.files.uploadFile;

    // Check if the file has a .zip extension
    if (path.extname(uploadedFile.name).toLowerCase() !== ".zip") {
      return res.status(400).send("Only .zip files are allowed.");
    }

    const uploadPath = path.join(__dirname, "ota_mcc", uploadedFile.name);
    const fileSize = uploadedFile.size;
    const fileSizeMD5 = md5(fileSize.toString());
    const zipFileName = uploadedFile.name;

    uploadedFile.mv(uploadPath, async function (err) {
      if (err) {
        console.log(err);
        return res.status(500).send("Failed to upload the ZIP file.");
      }

      // Extract the contents of the ZIP file
      const zip = new AdmZip(uploadPath);
      const zipEntries = zip.getEntries();

      // Find and read the JSON file
      const jsonFile = zipEntries.find(
        (entry) => path.extname(entry.entryName).toLowerCase() === ".json"
      );

      if (jsonFile) {
        const jsonDataText = zip.readAsText(jsonFile);
        const jsonData = JSON.parse(jsonDataText);

        var SQL =
          "INSERT INTO inf_ota (hw_version,system_version,build_date,target_device,signature_info,system_md5,zip_md5,zip_name ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8);";

        await pool.query(SQL, [
          jsonData.hw_version,
          jsonData.system_version,
          jsonData.build_date,
          jsonData.target_device,
          jsonData.signature_info,
          jsonData.system_md5,
          fileSizeMD5,
          zipFileName,
        ]);

        res.status(200).send("Successfully Uploaded and Processed JSON Data!!");
      } else {
        res.status(400).send("No .json file found in the ZIP archive.");
      }
    });
  } else {
    res.status(400).send("No file uploaded !!");
  }
});

app.get("/update_device", async function (req, res) {
  const device_id = req.headers["device_id"];
  const query = "SELECT * FROM inf_ota ORDER BY id DESC LIMIT 1";
  const inf_ota = await pool.query(query);
  const data = {
    serial_number: device_id,
    file_name: inf_ota.rows[0].zip_name,
    version: inf_ota.rows[0].system_version,
    target_device: inf_ota.rows[0].target_device,
  };
  sendToDevice(device_id + "/update_ota", data);
  res.status(200).send("OK");
});

app.get("/ota_mcc", function (req, res) {
  // console.log(req.header.auth_code);

  let code = req.header("auth_code");
  let file_name = req.header("file_name");
  let decript_data = decrypt(code);
  console.log(decript_data);
  // The res.download() talking file path to be downloaded
  const filePath = path.join(__dirname, "ota_mcc", file_name);
  res.download(filePath, function (err) {
    if (err) {
      console.log(err);
    }
  });
});
