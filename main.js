import axios from 'axios';
import dotenv from 'dotenv';
import cron from 'node-cron';
import express from 'express';

dotenv.config();

const API_KEY = process.env.MEXC_API_KEY;
const SECRET_KEY = process.env.MEXC_SECRET_KEY;
const BASE_URL = 'https://api.mexc.com';
const SYMBOL = 'XRPUSDT';

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

let capitalTotal = 180;
let historial = [];
let primeraCompraRealizada = false;

function getSignature(queryString) {
  const crypto = require('crypto');
  return crypto.createHmac('sha256', SECRET_KEY).update(queryString).digest('hex');
}

async function obtenerPrecioActual() {
  const res = await axios.get(`${BASE_URL}/api/v3/ticker/price?symbol=${SYMBOL}`);
  return parseFloat(res.data.price);
}

async function obtenerSaldoTotal() {
  const timestamp = Date.now();
  const queryString = `timestamp=${timestamp}`;
  const signature = getSignature(queryString);
  const res = await axios.get(`${BASE_URL}/api/v3/account?${queryString}&signature=${signature}`, {
    headers: { 'X-MEXC-APIKEY': API_KEY }
  });
  return res.data.balances;
}

async function enviarMensajeTelegram(mensaje) {
  const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;
  await axios.post(url, {
    chat_id: TELEGRAM_CHAT_ID,
    text: mensaje,
  });
}

async function hacerCompraInicial() {
  if (primeraCompraRealizada) return;

  const precio = await obtenerPrecioActual();
  const cantidad = 15 / precio;

  const timestamp = Date.now();
  const queryString = `symbol=${SYMBOL}&side=BUY&type=MARKET&quantity=${cantidad.toFixed(2)}&timestamp=${timestamp}`;
  const signature = getSignature(queryString);

  await axios.post(`${BASE_URL}/api/v3/order?${queryString}&signature=${signature}`, {}, {
    headers: { 'X-MEXC-APIKEY': API_KEY },
  });

  historial.push({ tipo: 'compra', precioCompra: precio, cantidad, vendida: false });
  primeraCompraRealizada = true;
  capitalTotal -= 15;

  console.log(`✅ Compra inicial realizada a ${precio}`);
}

async function evaluarYOperar() {
  if (!primeraCompraRealizada) return;

  const precioActual = await obtenerPrecioActual();
  const decision = Math.random() > 0.5 ? 'compra' : 'venta';

  if (decision === 'compra' && capitalTotal >= 15) {
    const cantidad = 15 / precioActual;
    const timestamp = Date.now();
    const queryString = `symbol=${SYMBOL}&side=BUY&type=MARKET&quantity=${cantidad.toFixed(2)}&timestamp=${timestamp}`;
    const signature = getSignature(queryString);

    await axios.post(`${BASE_URL}/api/v3/order?${queryString}&signature=${signature}`, {}, {
      headers: { 'X-MEXC-APIKEY': API_KEY },
    });

    historial.push({ tipo: 'compra', precioCompra: precioActual, cantidad, vendida: false });
    capitalTotal -= 15;

    console.log(`🟢 Compra aleatoria a ${precioActual}`);
  }

  if (decision === 'venta') {
    for (let i = 0; i < historial.length; i++) {
      const compra = historial[i];
      if (!compra.vendida && precioActual >= compra.precioCompra * 1.15) {
        const timestamp = Date.now();
        const queryString = `symbol=${SYMBOL}&side=SELL&type=MARKET&quantity=${compra.cantidad.toFixed(2)}&timestamp=${timestamp}`;
        const signature = getSignature(queryString);

        await axios.post(`${BASE_URL}/api/v3/order?${queryString}&signature=${signature}`, {}, {
          headers: { 'X-MEXC-APIKEY': API_KEY },
        });

        historial[i].vendida = true;
        capitalTotal += precioActual * compra.cantidad;

        const saldo = await obtenerSaldoTotal();
        const totalUSDT = saldo.find(a => a.asset === 'USDT')?.free || '0';

        const mensaje = `🔴 Venta completada a ${precioActual.toFixed(4)} con ganancia\n💰 Saldo USDT: ${totalUSDT}`;
        await enviarMensajeTelegram(mensaje);

        console.log(`🔴 Venta ejecutada a ${precioActual} (ganancia 15%)`);
      }
    }
  }
}

// 🕒 Ejecutar cada hora
cron.schedule('0 * * * *', async () => {
  console.log('⏰ Ejecutando bot...');
  await hacerCompraInicial();
  await evaluarYOperar();
});

// 🌐 Servidor para Railway
const app = express();
const PORT = process.env.PORT || 3000;
app.get('/', (req, res) => {
  res.send('✅ XRP Bot funcionando correctamente.');
});
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🌐 Servidor escuchando en http://0.0.0.0:${PORT}`);
});
