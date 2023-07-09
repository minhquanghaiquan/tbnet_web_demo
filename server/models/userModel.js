const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const users = new Schema({
  _id: {
    type: String,
    required: true,
  },
  username: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  resetToken: String,
  expireToken: Date,
});

module.exports = mongoose.model("user", users);
