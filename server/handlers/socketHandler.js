const { sendDataToClient, sendToDevice } = require("./messageHandler");
const { pool } = require("../config/dbConfig");
// const { io } = require("../config/socketConfig");
// const { client } = require("../config/mqttConfig");

const handleSocketIOConnection = (client, io) => {
  io.on("connection", (clientWeb) => {
    clientWeb.on("CurrentControl", async (data) => {
      console.log(data);
      let SQL =
        "UPDATE device_data SET " +
        data.key +
        "= $1 WHERE device_id = $2 AND id = (SELECT MAX(id) FROM device_data WHERE device_id = $3);";
      await pool.query(SQL, [data.value, data.device_id, data.device_id]);
      sendToDevice(client, data.device_id + "/control", data);
    });
  });

  setInterval(() => {
    sendDataToClient(io, "time", new Date().toTimeString());
  });
};

module.exports = { handleSocketIOConnection };
