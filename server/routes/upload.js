const express = require("express");
const path = require("path");
const fileUpload = require("express-fileupload");
const AdmZip = require("adm-zip");
const md5 = require("md5");
const {
  sendDataToClient,
  sendToDevice,
} = require("../handlers/messageHandler");
// const { io } = require("../config/socketConfig");
const { client } = require("../config/mqttConfig");
const { decrypt } = require("../handlers/decryptHandler");

const { pool } = require("../config/dbConfig");
const router = express.Router();

router.use(fileUpload());

router.get("/ota", (req, res) => {
  const filePath = path.join(__dirname, "..", "views", "partials", "ota.html");
  res.sendFile(filePath);
});

router.post("/upload_mcc", async function (req, res) {
  if (req.files && Object.keys(req.files).length !== 0) {
    const uploadedFile = req.files.uploadFile;

    // Check if the file has a .zip extension
    if (path.extname(uploadedFile.name).toLowerCase() !== ".zip") {
      return res.status(400).send("Only .zip files are allowed.");
    }

    const uploadPath = path.join(__dirname, "..", "ota_mcc", uploadedFile.name);
    const fileSize = uploadedFile.size;
    const fileSizeMD5 = md5(fileSize.toString());
    const zipFileName = uploadedFile.name;

    uploadedFile.mv(uploadPath, async function (err) {
      if (err) {
        console.log(err);
        return res.status(500).send("Failed to upload the ZIP file.");
      }

      // Extract the contents of the ZIP file
      const zip = new AdmZip(uploadPath);
      const zipEntries = zip.getEntries();

      // Find and read the JSON file
      const jsonFile = zipEntries.find(
        (entry) => path.extname(entry.entryName).toLowerCase() === ".json"
      );

      if (jsonFile) {
        const jsonDataText = zip.readAsText(jsonFile);
        const jsonData = JSON.parse(jsonDataText);

        var SQL =
          "INSERT INTO inf_ota (hw_version,system_version,build_date,target_device,signature_info,system_md5,zip_md5,zip_name ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8);";

        await pool.query(SQL, [
          jsonData.hw_version,
          jsonData.system_version,
          jsonData.build_date,
          jsonData.target_device,
          jsonData.signature_info,
          jsonData.system_md5,
          fileSizeMD5,
          zipFileName,
        ]);
        res.status(200).send("Successfully Uploaded and Processed JSON Data!!");
      } else {
        res.status(400).send("No .json file found in the ZIP archive.");
      }
    });
  } else {
    res.status(400).send("No file uploaded !!");
  }
});

router.get("/update_device", async function (req, res) {
  const device_id = req.headers["device_id"];
  const query = "SELECT * FROM inf_ota ORDER BY id DESC LIMIT 1";
  const inf_ota = await pool.query(query);
  const data = {
    serial_number: device_id,
    file_name: inf_ota.rows[0].zip_name,
    version: inf_ota.rows[0].system_version,
    target_device: inf_ota.rows[0].target_device,
  };
  sendToDevice(client, device_id + "/update_ota", data);
  res.status(200).send("OK");
});

router.get("/ota_mcc", function (req, res) {
  let code = req.header("auth_code");
  let file_name = req.header("file_name");
  let decript_data = decrypt(code);
  console.log(decript_data);
  // The res.download() talking file path to be downloaded
  const filePath = path.join(__dirname, "ota_mcc", file_name);
  res.download(filePath, function (err) {
    if (err) {
      console.log(err);
    }
  });
});

module.exports = router;
