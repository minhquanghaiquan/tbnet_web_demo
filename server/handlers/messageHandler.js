const sendDataToClient = async (io, topic, msg) => {
  io.emit(topic, msg);
};

const sendToDevice = async (client, topic, message) => {
  let data = JSON.stringify(message);
  console.log(topic);
  console.log(data);
  await client.publish(topic, data);
};

module.exports = { sendDataToClient, sendToDevice };
