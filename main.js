
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

dotenv.config();

const app = express(); app.use(express.json());

const PORT = process.env.PORT || 3000; const MEXC_API_KEY = process.env.MEXC_API_KEY; const MEXC_SECRET_KEY = process.env.MEXC_SECRET_KEY;

const PAIRS = ['XRPUSDT', 'SHIBUSDT', 'FETUSDT', 'CGPTUSDT']; const BASE_URL = 'https://api.mexc.com';

function sign(queryString) { return crypto.createHmac('sha256', MEXC_SECRET_KEY).update(queryString).digest('hex'); }

async function placeOrder(symbol, side) { try { const timestamp = Date.now(); const params = symbol=${symbol}&side=${side}&type=MARKET&quantity=${getQuantity(symbol)}&timestamp=${timestamp}; const signature = sign(params); const finalParams = ${params}&signature=${signature};

const response = await axios.post(`${BASE_URL}/api/v3/order?${finalParams}`, {}, {
  headers: {
    'X-MEXC-APIKEY': MEXC_API_KEY,
    'Content-Type': 'application/json'
  }
});

console.log(`✅ ${side} order placed for ${symbol}`, response.data);

} catch (error) { console.error(❌ Error placing ${side} order for ${symbol}:, error?.response?.data || error.message); } }

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
