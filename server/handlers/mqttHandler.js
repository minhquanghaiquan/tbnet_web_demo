const mqtt = require("mqtt");
const sql = require("sql");
const { pool } = require("../config/dbConfig");
const { sendDataToClient, sendToDevice } = require("./messageHandler");
const topic_mqtt = process.env.TOPIC_MQTT;

const connectToMQTT = (client, io) => {
  client.on("connect", async () => {
    console.log("MQTT connected");
    client.subscribe(topic_mqtt);
  });

  client.on("message", async (topic_mqtt, message) => {
    var data = message.toString();
    data = JSON.parse(data);
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
        data_insert.device_id = data.header.serial_number;
        let query = device_data.insert([data_insert]).returning("*").toQuery();
        await pool.query(query);

        var topic_mqtt_device = data.header.serial_number + "/control";

        sendDataToClient(io, topic_mqtt_device, data);
      }
    } catch (error) {
      console.log(error);
    }
  });
};

module.exports = { connectToMQTT };
