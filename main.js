
const axios = require('axios');
const { google } = require('googleapis');
const dayjs = require('dayjs');
require('dotenv').config();

const symbols = ['XRPUSDT', 'SHIBUSDT', 'FETUSDT', 'CGPTUSDT'];
const MAX_USDT_PER_PAIR = 40;
const PRICE_CHANGE_THRESHOLD = 0.15;

const SHEET_ID = process.env.SHEET_ID;
const SHEET_NAME = 'Historial';

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
    auth_provider_x509_cert_url: process.env.GOOGLE_AUTH_PROVIDER,
    client_x509_cert_url: process.env.GOOGLE_CLIENT_CERT
  },
  scopes: ['https://www.googleapis.com/auth/spreadsheets']
});

async function fetchPrice(symbol) {
  const url = `https://api.mexc.com/api/v3/ticker/price?symbol=${symbol}`;
  const res = await axios.get(url);
  return parseFloat(res.data.price);
}

async function fetchBalances() {
  const timestamp = Date.now();
  const query = `timestamp=${timestamp}`;
  const signature = require('crypto')
    .createHmac('sha256', process.env.MEXC_SECRET_KEY)
    .update(query)
    .digest('hex');

  const res = await axios.get(`https://api.mexc.com/api/v3/account?${query}&signature=${signature}`, {
    headers: {
      'X-MEXC-APIKEY': process.env.MEXC_API_KEY
    }
  });
  return res.data.balances.reduce((acc, bal) => {
    if (parseFloat(bal.free) > 0) acc[bal.asset] = parseFloat(bal.free);
    return acc;
  }, {});
}

async function appendSheet(data) {
  const sheets = google.sheets({ version: 'v4', auth });
  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: `${SHEET_NAME}!A1`,
    valueInputOption: 'USER_ENTERED',
    resource: { values: [data] }
  });
}

async function trade() {
  const balances = await fetchBalances();
  for (const symbol of symbols) {
    const price = await fetchPrice(symbol);
    const coin = symbol.replace('USDT', '');
    const usdt = balances['USDT'] || 0;
    const holding = balances[coin] || 0;

    const lastBuyPrice = parseFloat(process.env[`BUY_PRICE_${coin}`] || 0);

    if (!holding && usdt >= MAX_USDT_PER_PAIR) {
      // Comprar si ha bajado 15% desde último precio (o nunca compró)
      if (!lastBuyPrice || price <= lastBuyPrice * (1 - PRICE_CHANGE_THRESHOLD)) {
        await appendSheet([dayjs().format(), 'BUY', symbol, price, MAX_USDT_PER_PAIR / price]);
        process.env[`BUY_PRICE_${coin}`] = price.toString();
      }
    } else if (holding && price >= lastBuyPrice * (1 + PRICE_CHANGE_THRESHOLD)) {
      await appendSheet([dayjs().format(), 'SELL', symbol, price, holding]);
      process.env[`BUY_PRICE_${coin}`] = '0';
    }
  }
}

trade();
