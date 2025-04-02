const express = require('express');
const axios = require('axios');
const app = express();
const PORT = 9876;
const WINDOW_SIZE = 10;
let numberWindow = [];

const ACCESS_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJNYXBDbGFpbXMiOnsiZXhwIjoxNzQzNjAzODA1LCJpYXQiOjE3NDM2MDM1MDUsImlzcyI6IkFmZm9yZG1lZCIsImp0aSI6IjcwNTY0NWE2LTIyOGQtNDMyNC04NTgxLTVlNmZhYzYxYzJiYyIsInN1YiI6ImNsb3VkYW51cmFnMTFAZ21haWwuY29tIn0sImVtYWlsIjoiY2xvdWRhbnVyYWcxMUBnbWFpbC5jb20iLCJuYW1lIjoiYW51cmFnIHJhaiIsInJvbGxObyI6IjIyMDUyOTY4IiwiYWNjZXNzQ29kZSI6Im53cHdyWiIsImNsaWVudElEIjoiNzA1NjQ1YTYtMjI4ZC00MzI0LTg1ODEtNWU2ZmFjNjFjMmJjIiwiY2xpZW50U2VjcmV0IjoicHZGcmNyQ3ZxR3BVa1dLcSJ9.kNVM05ULzgf603uet-OJ48H8DoFjiJhoSGR_7A8tcwo";

const urls = {
  'p': 'http://20.244.56.144/evaluation-service/primes',
  'f': 'http://20.244.56.144/evaluation-service/fibo',
  'e': 'http://20.244.56.144/evaluation-service/even',
  'r': 'http://20.244.56.144/evaluation-service/rand'
};

app.get('/numbers/:type', async (req, res) => {
  const type = req.params.type;
  
  if (!urls[type]) {
    return res.status(400).json({ error: "Invalid type parameter" });
  }

  try {
    const response = await axios.get(urls[type], {
      headers: { Authorization: `Bearer ${ACCESS_TOKEN}` },
      timeout: 5000,
    });

    const newNumbers = response.data.numbers;
    const windowPrevState = [...numberWindow];

    numberWindow = [...new Set([...numberWindow, ...newNumbers])].slice(-WINDOW_SIZE);
    const avg = numberWindow.reduce((a, b) => a + b, 0) / numberWindow.length;

    res.json({
      windowPrevState,
      windowCurrState: numberWindow,
      numbers: newNumbers,
      avg: parseFloat(avg.toFixed(2))
    });

  } catch (error) {
    res.status(500).json({ error: "Failed to fetch numbers", details: error.message });
  }
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));