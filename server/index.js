require("dotenv").config();
const app = require("express")();
const server = require("http").createServer(app);
const mongoose = require("mongoose");
const shortId = require("shortid");
const jwt = require("jsonwebtoken");
const io = require("socket.io")(server, {
  cors: {
    origin: "*",
  },
});
const mqtt = require("mqtt");
const cors = require("cors");

var bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

const port_server = process.env.PORT_SERVER;
const client = mqtt.connect(process.env.HOST_MQTT);
const topic_mqtt = process.env.TOPIC_MQTT;
const host_mongodb = process.env.HOST_MONGODB;
const key_token = process.env.KEY_TOKEN;

app.use(cors());
app.options("*", cors());

const stations = require("./models/stationsModel");
const listStations = require("./models/listStationsModel");
const users = require("./models/userModel");

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
  data = JSON.parse(data);
  data.created = new Date().toTimeString();
  data._id = shortId.generate();
  await stations.findOneAndUpdate(
    { station_id: data.station_id },
    { $push: { station_values: data } }
  );
  topic_mqtt = topic_mqtt + data.station_id;
  sendDataToClient(topic_mqtt, data);
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
    console.log(token);
    if (!token) return res.json(false);

    const verified = jwt.verify(token, key_token);
    if (!verified) return res.json(false);

    const user = await users.findById(verified._id);
    if (!user) return res.json(false);

    return next();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

//REST API
app.get("/stations", tokenIsValid, async (req, res) => {
  var getListStations = await listStations.find({});
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
  //Check password
  if (user.password == password) {
    const token = jwt.sign({ _id: user._id }, key_token);
    res.json({
      token,
      user: {
        id: user._id,
        email: user.username,
      },
    });
  } else {
    res.status(400).send("Email or password is wrong!");
  }
});
