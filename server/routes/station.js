const express = require("express");
const router = express.Router();
const path = require("path");
const fs = require("fs");
const { pool } = require("../config/dbConfig");
const tokenIsValid = require("../middlewares/tokenIsValid");
const checkData = require("../handlers/checkData");

const configPath = path.join(__dirname, "..", "config", "setThreshold.json");

// REST API cho /stations
router.get("/liststation", (req, res) => {
  const indexPath = path.join(
    __dirname,
    "..",
    "views",
    "partials",
    "liststation.html"
  );
  res.sendFile(indexPath);
});

router.get("/data-stations", tokenIsValid, async (req, res) => {
  try {
    let SQL = "SELECT * FROM device;";
    const errorsAllStations = [];
    const listStations = await pool.query(SQL);

    let SQL1 =
      "SELECT DISTINCT ON (device_id) * FROM public.device_data ORDER BY device_id, id DESC;";
    const dataAllStations = await pool.query(SQL1);

    dataAllStations.rows.forEach((data) => {
      const errors = checkData(data);
      errorsAllStations.push(errors);
    });

    const currentACThreshold =
      JSON.parse(fs.readFileSync(configPath, "utf-8"))?.currentACThreshold ??
      20;

    return res.status(200).json({
      listStations: listStations.rows,
      errorsAllStations,
      currentACThreshold,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

router.post("/api/setThreshold", (req, res) => {
  const { currentACThreshold } = req.body;
  try {
    fs.writeFileSync(configPath, JSON.stringify({ currentACThreshold }));
    res.status(200).json({ message: "Threshold updated successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

router.get("/station/:device_id", async (req, res) => {
  const indexPath = path.join(
    __dirname,
    "..",
    "views",
    "partials",
    "station.html"
  );
  res.sendFile(indexPath);
});

router.get("/data-station/:device_id", tokenIsValid, async (req, res) => {
  try {
    var device_id = req.params.device_id;

    let SQL1 =
      "SELECT * FROM public.device_data WHERE device_id=$1 ORDER BY created_at DESC;";
    const device_data = await pool.query(SQL1, [device_id]);
    var lastValue = device_data.rows[0];
    return res.status(200).json({ lastValue });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
