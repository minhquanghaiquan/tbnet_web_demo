require("dotenv").config();
const app = require("express")();
const server = require("http").createServer(app);
const mongoose = require("mongoose");
const shortId = require("shortid");
const io = require("socket.io")(server, {
  cors: {
    origin: "*",
  },
});
const mqtt = require("mqtt");
const cors = require("cors");

const port_server = process.env.PORT_SERVER;
const client = mqtt.connect(process.env.HOST_MQTT);
const topic_mqtt = process.env.TOPIC_MQTT;
const host_mongodb = process.env.HOST_MONGODB;

app.use(cors());
app.options("*", cors());

const stations = require("./models/stationsModel");
const listStations = require("./models/listStationsModel");

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
io.on("connection", (client) => {
  console.log("Client connected" + client.id);
});

//Function
sendDataToClient = async (topic, msg) => {
  io.emit(topic, msg);
};

setInterval(() => {
  sendDataToClient("time", new Date().toTimeString());
});

//REST API
app.get("/stations", async (req, res) => {
  var getListStations = await listStations.find({});
  return res.status(200).json(getListStations);
});

app.get("/stations/:station_id", async (req, res) => {
  var station_id = req.params.station_id;
  var thisStation = await stations.findOne({ station_id: station_id });
  var lastValue =
    thisStation.station_values[thisStation.station_values.length - 1];
  return res.status(200).json(lastValue);
});
