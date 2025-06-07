// main.js actualizado con simulación inteligente tipo Perplexity
import axios from 'axios';
import dotenv from 'dotenv';
import cron from 'node-cron';
import express from 'express';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

const API_KEY = process.env.MEXC_API_KEY;
const SECRET_KEY = process.env.MEXC_SECRET_KEY;
const BASE_URL = 'https://api.mexc.com';
const SYMBOL = 'XRPUSDT';

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

function consultaPerplexitySimulada(tipo, precio) {
  // Simulación básica de IA
  if (tipo === 'compra' && precio < 2.3) return { ok: true, mensaje: '✅ Buen momento para comprar según IA' };
  if (tipo === 'venta' && precio > 2.5) return { ok: true, mensaje: '📈 Buen momento para vender según IA' };
  return { ok: false, mensaje: '⏳ Mejor esperar, IA no recomienda esta operación ahora.' };
}

async function hacerCompraInicial() {
  if (primeraCompraRealizada) return;
  const precio = await obtenerPrecioActual();
  const decision = consultaPerplexitySimulada('compra', precio);
  console.log(decision.mensaje);
  if (!decision.ok) return;

  const cantidad = 15 / precio;
  const queryString = `symbol=${SYMBOL}&side=BUY&type=MARKET&quantity=${cantidad.toFixed(2)}&timestamp=${Date.now()}`;
  const signature = getSignature(queryString);
  await axios.post(`${BASE_URL}/api/v3/order?${queryString}&signature=${signature}`, {}, {
    headers: { 'X-MEXC-APIKEY': API_KEY },
  });
  historial.push({ tipo: 'compra', precioCompra: precio, cantidad });
  primeraCompraRealizada = true;
  console.log(`✅ Compra inicial realizada a ${precio}`);
}

async function evaluarYOperar() {
  if (!primeraCompraRealizada) return;
  const precioActual = await obtenerPrecioActual();
  const decisionAleatoria = Math.random() > 0.5 ? 'compra' : 'venta';

  const decisionIA = consultaPerplexitySimulada(decisionAleatoria, precioActual);
  console.log(decisionIA.mensaje);
  if (!decisionIA.ok) return;

  if (decisionAleatoria === 'compra' && capitalTotal >= 15) {
    const cantidad = 15 / precioActual;
    const queryString = `symbol=${SYMBOL}&side=BUY&type=MARKET&quantity=${cantidad.toFixed(2)}&timestamp=${Date.now()}`;
    const signature = getSignature(queryString);
    await axios.post(`${BASE_URL}/api/v3/order?${queryString}&signature=${signature}`, {}, {
      headers: { 'X-MEXC-APIKEY': API_KEY },
    });
    historial.push({ tipo: 'compra', precioCompra: precioActual, cantidad });
    capitalTotal -= 15;
    console.log(`🟢 Compra aleatoria a ${precioActual}`);
  } else if (decisionAleatoria === 'venta') {
    for (let i = 0; i < historial.length; i++) {
      const compra = historial[i];
      if (!compra.vendida && precioActual >= compra.precioCompra * 1.15) {
        const queryString = `symbol=${SYMBOL}&side=SELL&type=MARKET&quantity=${compra.cantidad.toFixed(2)}&timestamp=${Date.now()}`;
        const signature = getSignature(queryString);
        await axios.post(`${BASE_URL}/api/v3/order?${queryString}&signature=${signature}`, {}, {
          headers: { 'X-MEXC-APIKEY': API_KEY },
        });
        capitalTotal += precioActual * compra.cantidad;
        historial[i].vendida = true;
        console.log(`🔴 Venta ejecutada a ${precioActual} con ganancia (15%)`);
      }
    }
  }
}

cron.schedule('0 * * * *', async () => {
  console.log('⏰ Ejecutando bot...');
  await hacerCompraInicial();
  await evaluarYOperar();
});

app.get('/', (req, res) => {
  res.send('🟢 Bot XRP ejecutándose con IA simulada Perplexity.');
});

app.listen(port, () => {
  console.log(`🚀 Servidor en puerto ${port}`);
});
