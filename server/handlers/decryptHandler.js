const crypto = require("crypto");

function decrypt(encryptedData) {
  const password = "tbnet_host_key_password_checkqe";
  const iv = Buffer.alloc(16);
  let data = crypto.createHash("sha256").update(password).digest("hex");
  let encryptedText = Buffer.from(encryptedData, "hex");
  let decipher = crypto.createDecipheriv(
    "aes-256-cbc",
    Buffer.from(data, "hex"),
    iv
  );
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}

module.exports = { decrypt };
