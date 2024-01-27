const mqtt = require("mqtt");

const username_mqtt = process.env.USERNAME_MQTT;
const password_mqtt = process.env.PASSWORD_MQTT;
const clientId_mqtt = process.env.CLIENT_ID_MQTT;

const client = mqtt.connect(process.env.HOST_MQTT, {
  clientId: clientId_mqtt,
  username: username_mqtt,
  password: password_mqtt,
  clean: true,
});

module.exports = { client };
