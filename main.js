const axios = require('axios');
const cron = require('node-cron');
const express = require('express');
require('dotenv').config();

const API_KEY = process.env.MEXC_API_KEY;
const SECRET_KEY = process.env.MEXC_SECRET_KEY;
const SYMBOL = 'XRPUSDT';
const BASE_URL = 'https://api.mexc.com';

let primeraCompra = false;
let historial = [];
let capitalMaximo = 180;

function getSignature(queryString) {
  const crypto = require('crypto');
  return crypto.createHmac('sha256', SECRET_KEY).update(queryString).digest('hex');
}

async function obtenerPrecioActual() {
  const res = await axios.get(`${BASE_URL}/api/v3/ticker/price?symbol=${SYMBOL}`);
  return parseFloat(res.data.price);
}

async function ejecutarOrdenMarket(side, quantity) {
  const timestamp = Date.now();
  const query = `symbol=${SYMBOL}&side=${side}&type=MARKET&quantity=${quantity}&timestamp=${timestamp}`;
  const signature = getSignature(query);
  const url = `${BASE_URL}/api/v3/order?${query}&signature=${signature}`;
  const res = await axios.post(url, {}, {
    headers: { 'X-MEXC-APIKEY': API_KEY }
  });
  return res.data;
}

async function hacerCompraInicial() {
  if (primeraCompra) return;
  const precio = await obtenerPrecioActual();
  const cantidad = +(15 / precio).toFixed(2);
  const orden = await ejecutarOrdenMarket('BUY', cantidad);
  historial.push({ precio, cantidad, vendida: false });
  primeraCompra = true;
  console.log(`✅ Compra inicial realizada: ${cantidad} XRP a ${precio} USDT`);
}

async function evaluarYOperar() {
  const precioActual = await obtenerPrecioActual();
  const decision = Math.random() > 0.5 ? 'compra' : 'venta';

  if (decision === 'compra' && capitalMaximo >= 15) {
    const cantidad = +(15 / precioActual).toFixed(2);
    await ejecutarOrdenMarket('BUY', cantidad);
    historial.push({ precio: precioActual, cantidad, vendida: false });
    capitalMaximo -= 15;
    console.log(`🟢 Compra aleatoria de ${cantidad} XRP a ${precioActual} USDT`);
  }

  if (decision === 'venta') {
    for (let trans of historial) {
      if (!trans.vendida && precioActual >= trans.precio * 1.15) {
        await ejecutarOrdenMarket('SELL', trans.cantidad);
        trans.vendida = true;
        capitalMaximo += precioActual * trans.cantidad;
        console.log(`🔴 Venta con +15% a ${precioActual} USDT | Saldo estimado: ${capitalMaximo.toFixed(2)} USDT`);
      }
    }
  }
}

cron.schedule('*/30 * * * *', async () => {
  console.log('⏰ Revisión automática...');
  await hacerCompraInicial();
  await evaluarYOperar();
});

// Webhook y keep-alive
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => res.send('🟢 XRP Bot activo y esperando señales...'));

app.listen(PORT, () => console.log(`🌐 Servidor corriendo en puerto ${PORT}`));