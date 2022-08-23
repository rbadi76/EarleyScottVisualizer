const path = require('path');
const express = require('express');
const app = express();


const hostname = '127.0.0.1';
const port = process.env.PORT || 3500;

app.use(express.static("."));

app.listen(port, () => {
    console.log(`EarleyScottVisualizer client listening on port ${port}`)
});
