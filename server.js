const express = require('express');
const path = require('path');
const cors = require('cors');

const PORT = process.env.PORT || 3000;
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.listen(PORT, () => {
  console.log(`🚀 Task Widget Server running locally on http://localhost:${PORT}`);
});
