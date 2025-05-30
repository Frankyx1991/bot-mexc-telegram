
import express from 'express';
import { google } from 'googleapis';
import cron from 'node-cron';
import dotenv from 'dotenv';
import axios from 'axios';
import crypto from 'crypto';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Estado para UptimeRobot
app.get('/', (req, res) => {
  res.send('✅ El bot está funcionando correctamente.');
});

// Firmar para MEXC
function sign(queryString) {
  return crypto.createHmac('sha256', process.env.MEXC_API_SECRET)
    .update(queryString)
    .digest('hex');
}

// Enviar orden a MEXC
async function placeOrder(symbol, side, quantity) {
  const timestamp = Date.now();
  const query = `symbol=${symbol}&side=${side}&type=MARKET&quantity=${quantity}&timestamp=${timestamp}`;
  const signature = sign(query);
  const url = `https://api.mexc.com/api/v3/order?${query}&signature=${signature}`;
  try {
    const response = await axios.post(url, null, {
      headers: {
        'X-MEXC-APIKEY': process.env.MEXC_API_KEY,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    console.log('✅ Orden ejecutada:', response.data);
    return response.data;
  } catch (err) {
    console.error('❌ Error al operar en MEXC:', err.response?.data || err.message);
    return null;
  }
}

// Añadir datos a Google Sheets
async function agregarDatosASheets(moneda, precio) {
  try {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        type: process.env.GOOGLE_TYPE,
        project_id: process.env.GOOGLE_PROJECT_ID,
        private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID,
        private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        client_id: process.env.GOOGLE_CLIENT_ID,
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const timestamp = new Date().toISOString();

// main.js import express from 'express'; import crypto from 'crypto'; import axios from 'axios'; import dotenv from 'dotenv';

// main.js (solo con MEXC y TradingView, sin Google Sheets)

import express from 'express'; import axios from 'axios'; import crypto from 'crypto'; import dotenv from 'dotenv';

dotenv.config();

const app = express(); const port = process.env.PORT || 3000;

app.use(express.json());

// Firmar la solicitud para la API de MEXC function signRequest(params, secretKey) { const orderedParams = Object.keys(params) .sort() .map((key) => ${key}=${params[key]}) .join('&'); return crypto.createHmac('sha256', secretKey).update(orderedParams).digest('hex'); }

// Ejecutar una orden (compra o venta) async function ejecutarOrden(symbol, side, quantity) { const timestamp = Date.now(); const params = { symbol, side, type: 'MARKET', quantity, timestamp, };

const signature = signRequest(params, process.env.MEXC_SECRET_KEY); const query = new URLSearchParams({ ...params, signature }).toString();

try { const response = await axios.post( https://api.mexc.com/api/v3/order?${query}, {}, { headers: { 'X-MEXC-APIKEY': process.env.MEXC_API_KEY, 'Content-Type': 'application/json', }, } ); console.log(✅ Orden ${side} ejecutada:, response.data); } catch (error) { console.error('❌ Error al ejecutar la orden:', error.response?.data || error.message); } }

// Webhook desde TradingView app.post('/webhook', async (req, res) => { const { symbol, side, quantity } = req.body;

if (!symbol || !side || !quantity) { return res.status(400).send('❌ Faltan datos: symbol, side o quantity.'); }

await ejecutarOrden(symbol, side.toUpperCase(), quantity); res.send('📩 Orden procesada'); });

app.get('/', (req, res) => { res.send('✅ Bot MEXC conectado y esperando señales.'); });

app.listen(port, '0.0.0.0', () => { console.log(🚀 Servidor escuchando en puerto ${port}); });

error.message); } }

function getQuantity(symbol) { switch (symbol) { case 'XRPUSDT': return 18;     // Ajustar cantidad según balance case 'SHIBUSDT': return 700000; case 'FETUSDT': return 48; case 'CGPTUSDT': return 30; default: return 0; } }

app.post('/webhook', async (req, res) => { const { symbol, action } = req.body; if (!PAIRS.includes(symbol) || !['BUY', 'SELL'].includes(action)) { return res.status(400).send('Invalid payload'); } await placeOrder(symbol, action); res.send('Order executed'); });

app.get('/', (req, res) => { res.send('✅ Bot activo y escuchando TradingView'); });

app.listen(PORT, '0.0.0.0', () => { console.log(🚀 Servidor corriendo en el puerto ${PORT}); });

200000);
      }
    }
  } catch (error) {
    console.error('❌ Error en estrategia automática:', error.message);
  }
}

// Ejecutar cada hora
cron.schedule('0 * * * *', () => {
  estrategiaAutomatica();
});

// Iniciar servidor
app.listen(port, '0.0.0.0', () => {
  console.log(`✅ Servidor corriendo en el puerto ${port}`);
});
