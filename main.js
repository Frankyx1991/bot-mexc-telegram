import axios from 'axios';
import dotenv from 'dotenv';
import cron from 'node-cron';
import express from 'express';
import crypto from 'crypto';

dotenv.config();

const API_KEY = process.env.MEXC_API_KEY;
const SECRET_KEY = process.env.MEXC_SECRET_KEY;
const BASE_URL = 'https://api.mexc.com';
const SYMBOL = 'XRPUSDT';
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

let capitalTotal = 180;
let historial = [];
let primeraCompraRealizada = false;

const app = express();
const port = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('✅ Bot activo y funcionando.');
});

app.listen(port, () => {
  console.log(`🌐 Servidor escuchando en el puerto ${port}`);
});

function getSignature(queryString) {
  return crypto.createHmac('sha256', SECRET_KEY).update(queryString).digest('hex');
}

async function enviarTelegram(mensaje) {
  try {
    await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      chat_id: CHAT_ID,
      text: mensaje,
    });
  } catch (err) {
    console.error('❌ Error al enviar mensaje a Telegram:', err.message);
  }
}

async function obtenerPrecioActual() {
  const res = await axios.get(`${BASE_URL}/api/v3/ticker/price?symbol=${SYMBOL}`);
  return parseFloat(res.data.price);
}

async function hacerOrden(side, quantity) {
  const timestamp = Date.now();
  const queryString = `symbol=${SYMBOL}&side=${side}&type=MARKET&quantity=${quantity}&timestamp=${timestamp}`;
  const signature = getSignature(queryString);
  const url = `${BASE_URL}/api/v3/order?${queryString}&signature=${signature}`;
  const res = await axios.post(url, {}, { headers: { 'X-MEXC-APIKEY': API_KEY } });
  return res.data;
}

async function hacerCompraInicial() {
  if (primeraCompraRealizada) return;
  const precio = await obtenerPrecioActual();
  const cantidad = (15 / precio).toFixed(2);
  const orden = await hacerOrden('BUY', cantidad);
  historial.push({ tipo: 'compra', precioCompra: precio, cantidad: parseFloat(cantidad), vendida: false });
  primeraCompraRealizada = true;
  await enviarTelegram(`✅ Compra inicial realizada a ${precio}`);
}

async function evaluarYOperar() {
  if (!primeraCompraRealizada) return;

  const precio = await obtenerPrecioActual();
  const decision = Math.random() > 0.5 ? 'compra' : 'venta';

  if (decision === 'compra' && capitalTotal >= 15) {
    const cantidad = (15 / precio).toFixed(2);
    await hacerOrden('BUY', cantidad);
    historial.push({ tipo: 'compra', precioCompra: precio, cantidad: parseFloat(cantidad), vendida: false });
    capitalTotal -= 15;
    await enviarTelegram(`🟢 Compra aleatoria realizada a ${precio}`);
  } else if (decision === 'venta') {
    for (let i = 0; i < historial.length; i++) {
      const compra = historial[i];
      if (!compra.vendida && precio >= compra.precioCompra * 1.15) {
        await hacerOrden('SELL', compra.cantidad.toFixed(2));
        capitalTotal += precio * compra.cantidad;
        historial[i].vendida = true;
        await enviarTelegram(`🔴 Venta realizada a ${precio} con beneficio sobre compra a ${compra.precioCompra}`);
      }
    }
  }
}

cron.schedule('0 * * * *', async () => {
  console.log('⏰ Ejecutando bot...');
  await hacerCompraInicial();
  await evaluarYOperar();
});
