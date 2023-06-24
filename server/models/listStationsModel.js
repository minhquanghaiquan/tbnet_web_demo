const mongoose = require('mongoose');
const moment = require('moment');

const Schema = mongoose.Schema;

const listStationSchema = new Schema({
    _id: {
        type: String,
        required: true
    },
    station_id: {
        type: String,
        required: true
    },
    station_name: {
        type: String,
        required: true
    },
    station_address: {
        type: String,
        required: true
    }
});


module.exports = mongoose.model('liststation', listStationSchema);