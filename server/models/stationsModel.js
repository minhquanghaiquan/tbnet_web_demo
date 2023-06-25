const mongoose = require("mongoose");
const moment = require("moment");

const Schema = mongoose.Schema;

const stationSchema = new Schema({
  _id: {
    type: String,
    required: true,
  },
  station_id: {
    type: String,
    required: true,
  },
  station_name: {
    type: String,
    required: true,
  },
  station_address: {
    type: String,
    required: true,
  },
  status_currentcontrol: {
    type: Number,
    required: true,
  },
  station_values: [
    {
      station_id: String,
      value001: Number,
      value002: Number,
      value003: Number,
      value004: Number,
      value005: Number,
      created: String,
      _id: String,
    },
  ],
});

module.exports = mongoose.model("station", stationSchema);
