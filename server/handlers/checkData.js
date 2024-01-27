const fs = require("fs");
const path = require("path");

const configPath = path.join(__dirname, "..", "config", "setThreshold.json");
const configData = JSON.parse(fs.readFileSync(configPath, "utf-8"));
const currentACThreshold = configData.currentACThreshold || 20;

const checkData = (payload) => {
  const checkVoltageAC = ["s6", "s7", "s8"];
  const checkCurrentAC = ["s24", "s25", "s26"];
  const checkFreAC = ["s15", "s16", "s17"];

  const checkVoltageDC = ["s300", "s301", "s302", "s303"];
  const checkCurrentDC = ["s305", "s306", "s307", "s308", "s309", "s304"];

  const checkTemp = ["s700", "s701", "s702", "s703"];
  console.log(currentACThreshold);

  var err1 = 0,
    err2 = 0,
    err3 = 0,
    err4 = 0,
    err5 = 0,
    err6 = 0;

  //Check AC

  if (
    checkVoltageAC.some(
      (key) => payload[key] === 0 || payload[key] === undefined
    )
  ) {
    console.log("Mat dien AC");
    err1 = 1;
  }

  if (checkCurrentAC.some((key) => payload[key] > currentACThreshold)) {
    console.log(" Qua dong AC");
    err2 = 1;
  }
  if (
    checkFreAC.some((key) => payload[key] === 0 || payload[key] === undefined)
  ) {
    console.log(" Mat pha");
    err3 = 1;
  }

  //Check DC

  if (
    checkVoltageDC.some(
      (key) => payload[key] === 0 || payload[key] === undefined
    )
  ) {
    console.log("Mat dien DC");
    err4 = 1;
  }

  if (checkCurrentDC.some((key) => payload[key] > currentACThreshold)) {
    console.log(" Qua dong DC");
    err5 = 1;
  }

  //Check nhiet do
  if (checkTemp.some((key) => payload[key] > 30)) {
    console.log("Qua nhiet");
    err6 = 1;
  }

  var error_data = {
    device_id: payload.device_id,
    err1,
    err2,
    err3,
    err4,
    err5,
    err6,
  };

  console.log(error_data);

  return error_data;
};

module.exports = checkData;
