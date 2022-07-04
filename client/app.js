const path = require('path');
const express = require('express');
const app = express();


const hostname = '127.0.0.1';
const port = process.env.PORT || 3500;

app.get('/', function(req, res) {
    res.sendFile(path.join(__dirname, '/index.html'));
  });

app.get('/js/main.js', function(req, res) {
  res.sendFile(path.join(__dirname, '/js/main.js'));
});

app.listen(port, () => {
    console.log(`EarleyScottVisualizer client listening on port ${port}`)
})