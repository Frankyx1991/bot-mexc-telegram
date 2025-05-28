import 'dotenv/config';
import { google } from 'googleapis';
import axios from 'axios';

const API_KEY = process.env.API_KEY;
const API_SECRET = process.env.API_SECRET;
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
const CLIENT_EMAIL = process.env.GOOGLE_CLIENT_EMAIL;
const PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n');

const auth = new google.auth.JWT(
  CLIENT_EMAIL,
  null,
  PRIVATE_KEY,
  ['https://www.googleapis.com/auth/spreadsheets']
);

const sheets = google.sheets({ version: 'v4', auth });

async function logToSheet(data) {
  const values = [[
    new Date().toISOString(),
    data.symbol,
    data.action,
    data.amount,
    data.price
  ]];

  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: 'Operaciones!A1',
    valueInputOption: 'USER_ENTERED',
    resource: { values }
  });
}

async function checkPrices() {
  try {
    const symbols = ['XRP', 'SHIB', 'FET', 'CGPT'];
    for (const symbol of symbols) {
      const response = await axios.get(`https://api.mexc.com/api/v3/ticker/price?symbol=${symbol}USDT`);
      const currentPrice = parseFloat(response.data.price);

      // Simulación simple
      const decision = Math.random() > 0.5 ? 'BUY' : 'SELL';
      const amount = 5;
      const action = {
        symbol: symbol,
        action: decision,
        amount: amount,
        price: currentPrice
      };

      console.log(`Operación: ${decision} ${amount} ${symbol} a ${currentPrice}`);
      await logToSheet(action);
    }
  } catch (error) {
    console.error('Error al comprobar precios:', error.message);
  }
}

checkPrices();
