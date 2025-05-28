const express = require("express");
const axios = require("axios");
const app = express();
const PORT = process.env.PORT || 8080;

app.get("/test", async (req, res) => {
  res.send("✅ El bot está funcionando correctamente.");
});

app.listen(PORT, () => {
  console.log(`Servidor activo en http://localhost:${PORT}`);
});