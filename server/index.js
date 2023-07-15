require("dotenv").config();
const express = require("express");
const app = express();
const server = require("http").createServer(app);
const path = require("path");
const io = require("socket.io")(server, {
  cors: {
    origin: "*",
  },
});
const mqtt = require("mqtt");
const cors = require("cors");
var bodyParser = require("body-parser");

//token-id
const crypto = require("crypto");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const shortId = require("shortid");

//require db
const mongoose = require("mongoose");
// const mongodb = require("mongodb");
const stations = require("./models/stationsModel");
const listStations = require("./models/listStationsModel");
const users = require("./models/userModel");

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
const host_mongodb = process.env.HOST_MONGODB;
//mqtt broker
const topic_mqtt = process.env.TOPIC_MQTT;
const username_mqtt = process.env.USERNAME_MQTT;
const password_mqtt = process.env.PASSWORD_MQTT;
const client = mqtt.connect(process.env.HOST_MQTT, {
  username: username_mqtt,
  password: password_mqtt,
});

//Create server
server.listen(port_server, async () => {
  console.log(`Example server listening on port ${port_server}`);
  await mongoose.connect(host_mongodb);
});

//Connect to MongoDB
mongoose.connection.on("connected", async () => {
  console.log("MongoDB connected");
});
mongoose.connection.on("error", async () => {
  console.log("MongoDB connect fail");
});

//Connect to MQTT broker
client.on("connect", async () => {
  console.log("MQTT connected");
  client.subscribe(topic_mqtt);
});

client.on("message", async (topic_mqtt, message) => {
  var data = message.toString();
  if (data) {
    data = JSON.parse(data);
    data.created = new Date().toTimeString();
    data._id = shortId.generate();
    await stations.findOneAndUpdate(
      { station_id: data.station_id },
      { $push: { station_values: data } }
    );
    topic_mqtt = topic_mqtt + data.station_id;
    sendDataToClient(topic_mqtt, data);
  }
});

// Connect to client by socket io
io.on("connection", (clientWeb) => {
  console.log("Client connected" + clientWeb.id);
  clientWeb.on("CurrentControl", async (data) => {
    console.log(data);
    await stations.findOneAndUpdate(
      { station_id: data.station_id },
      { status_currentcontrol: data.status_currentcontrol },
      { new: true }
    );
    sendToDevice("CurrentControl" + data.station_id, data);
  });
});

//Function
sendDataToClient = async (topic, msg) => {
  io.emit(topic, msg);
};

sendToDevice = async (topic, message) => {
  let data = JSON.stringify(message);
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

    const user = await users.findOne({ username: verified.username });
    console.log(user);
    if (!user) return res.json(false);
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
  var getListStations = await listStations.find({});
  console.log(getListStations);
  return res.status(200).json(getListStations);
});

app.get("/stations/:station_id", tokenIsValid, async (req, res) => {
  var station_id = req.params.station_id;
  var thisStation = await stations.findOne({ station_id: station_id });
  var lastValue =
    thisStation.station_values[thisStation.station_values.length - 1];
  var status_currentcontrol = thisStation.status_currentcontrol;
  return res.status(200).json({ lastValue, status_currentcontrol });
});

app.post("/login", async (req, res) => {
  var { username, password } = req.body;
  const user = await users.findOne({ username });
  if (!user) return res.status(400).send("Username or password is wrong");
  //ss
  bcrypt.compare(password, user.password).then((doMatch) => {
    if (doMatch) {
      const token = jwt.sign({ username: user.username }, key_token);
      res.json({
        token,
        user: {
          id: user._id,
          email: user.username,
        },
      });
    } else {
      return res.status(400).json({ error: "Invalid Email or password" });
    }
  });
});

app.post("/auth/forgotpassword", (req, res) => {
  crypto.randomBytes(32, (err, buffer) => {
    if (err) {
      console.log(err);
    }
    const token = buffer.toString("hex");
    console.log(req.body.emailUser);
    console.log(token);

    users
      .findOneAndUpdate(
        { username: req.body.emailUser },
        { $set: { resetToken: token, expireToken: Date.now() + 3600000 } }
      )
      .then(async (user) => {
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
          to: user.username, // Gửi đến ai?
          subject: "Reset password - TBNET-WEB", // Tiêu đề email
          html: `
          <p>You requested for password reset</p>
          <h3>Click in this <a href="http://178.128.113.184:8081/reset/${token}">link</a> to reset password</h3>
          `,
        };
        await transport.sendMail(mailOptions);
        res.json({ message: "check your email" });
      })
      .catch((err) => {
        console.log(err);
      });

    // users.findOne({ username: req.body.emailUser }).then((user) => {
    //   console.log(user);
    //   if (!user) {
    //     return res
    //       .status(422)
    //       .json({ error: "User dont exists with that email" });
    //   }
    //   user.resetToken = token;
    //   user.expireToken = Date.now() + 3600000;
    //   console.log(user);
    //   user.save().then(async (result) => {
    //     const myAccessTokenObject = await myOAuth2Client.getAccessToken();
    //     const myAccessToken = myAccessTokenObject?.token;

    //     const transport = nodemailer.createTransport({
    //       service: "gmail",
    //       auth: {
    //         type: "OAuth2",
    //         user: ADMIN_EMAIL_ADDRESS,
    //         clientId: GOOGLE_MAILER_CLIENT_ID,
    //         clientSecret: GOOGLE_MAILER_CLIENT_SECRET,
    //         refresh_token: GOOGLE_MAILER_REFRESH_TOKEN,
    //         accessToken: myAccessToken,
    //       },
    //     });

    //     const mailOptions = {
    //       to: user.username, // Gửi đến ai?
    //       subject: "Reset password - TBNET-WEB", // Tiêu đề email
    //       html: `
    //       <p>You requested for password reset</p>
    //       <h3>Click in this <a href="http://localhost:8080/reset/${token}">link</a> to reset password</h3>
    //       `,
    //     };

    //     await transport.sendMail(mailOptions);

    //     res.json({ message: "check your email" });
    //   });
    // });
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
  users
    .findOneAndUpdate(
      { resetToken: sentToken, expireToken: { $gt: Date.now() } },
      {
        $set: {
          password: hashedpassword,
          expireToken: null,
          resetToken: null,
        },
      },
      { new: true }
    )
    .then((saveduser) => {
      console.log(saveduser);
      res.json({ message: "password updated success" });
    })
    .catch((err) => {
      console.log(err);
    });
});
