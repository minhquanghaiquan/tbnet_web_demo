require("dotenv").config();
const express = require("express");
const app = express();
const server = require("http").createServer(app);
const cors = require("cors");
var bodyParser = require("body-parser");

//Routes
const routeIndex = require("./routes/index");
const authRoutes = require("./routes/auth");
const stationRoutes = require("./routes/station");
const uploadRoutes = require("./routes/upload");

//Handler-Config
const { connectToMQTT } = require("./handlers/mqttHandler");
const { handleSocketIOConnection } = require("./handlers/socketHandler");
const { initializeDatabase } = require("./handlers/databaseSetup");
const { addSampleData } = require("./handlers/sampleData");

const { client } = require("./config/mqttConfig");
const { initializeSocketIO, getIOInstance } = require("./config/socketConfig");

//Param
const port_server = process.env.PORT_SERVER;

//app.use
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cors());
app.options("*", cors());
app.use("/public", express.static(__dirname + "/public"));

//Create server
server.listen(port_server, async () => {
  console.log(`Example server listening on port ${port_server}`);
  await initializeDatabase();
  await addSampleData();
});

/* Socket - MQTT */
// Init Socket.IO
initializeSocketIO(server);
const io = getIOInstance();
//Connect to MQTT broker
connectToMQTT(client, io);
// Connect to client by socket
handleSocketIOConnection(client, io);

//REST API
app.use("/", routeIndex);
app.use("/auth", authRoutes);
app.use("/", stationRoutes);
app.use("/", uploadRoutes);
