import { google } from 'googleapis';
import axios from 'axios';
import express from 'express';

const app = express();
const port = process.env.PORT || 8080;

// Configurar Google Sheets API
const auth = new google.auth.GoogleAuth({
  credentials: {
    type: process.env.GOOGLE_TYPE,
    project_id: process.env.GOOGLE_PROJECT_ID,
    private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID,
    private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    client_id: process.env.GOOGLE_CLIENT_ID,
    auth_uri: process.env.GOOGLE_AUTH_URI,
    token_uri: process.env.GOOGLE_TOKEN_URI,
    auth_provider_x509_cert_url: process.env.GOOGLE_AUTH_PROVIDER_X509_CERT_URL,
    client_x509_cert_url: process.env.GOOGLE_CLIENT_X509_CERT_URL
  },
  scopes: ['https://www.googleapis.com/auth/spreadsheets']
});
const sheets = google.sheets({ version: 'v4', auth });

const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID;

async function obtenerPrecio(par) {
  const res = await axios.get('https://api.mexc.com/api/v3/ticker/price', {
    params: { symbol: par }
  });
  return parseFloat(res.data.price);
}

async function registrarOperacion(par, side, precio) {
  const now = new Date().toLocaleString("es-ES", { timeZone: "Europe/Madrid" });
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: 'Operaciones!A:D',
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [[now, par, side, precio]]
    }
  });
}

async function ejecutarOperacion() {
  const pares = ['XRPUSDT', 'SHIBUSDT', 'FETUSDT', 'CGPTUSDT'];
  const porcentajeCompra = -15;
  const porcentajeVenta = 15;

  for (const par of pares) {
    try {
      const precioActual = await obtenerPrecio(par);
      console.log(`📈 ${par} = ${precioActual}`);

      // Aquí puedes añadir lógica de compra o venta
      await registrarOperacion(par, "Verificación", precioActual);
    } catch (err) {
      console.error(`❌ Error con ${par}:`, err.message);
    }
  }
}

ejecutarOperacion();
setInterval(ejecutarOperacion, 60 * 60 * 1000); // Cada 60 minutos

app.get('/', (req, res) => {
  res.send("✅ El bot está funcionando correctamente.");
});

app.listen(port, () => {
  console.log(`Servidor iniciado en el puerto ${port}`);
});
