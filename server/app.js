
const express = require('express');
const app = express();
const cors = require('cors');

const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ limit: '5mb', extended: true }));
app.use(bodyParser.json({ limit: '5mb' }));
app.use(cors());

const port = process.env.PORT || 3000;

app.get('/api/v1/testget', (req, res) => {
    let respArray = [];
    respArray.push({ id: 1, value: 1 });
    return res.status(200).json(respArray);
});

app.post('/api/v1/testpost', (req, res) => {
    let respArray = [];
    console.log(`Got id ${req.body.id} and value ${req.body.value}`);
    if(req.body.id == 9 && req.body.value == 19)
    {
        respArray.push({ result: 'OK'});
        return res.status(200).json(respArray);
    }
    else
    {
        respArray.push({ result: 'Incorrect!'});
        return res.status(400).json(respArray);
    }
    
});

app.listen(port, () => {
    console.log(`EarleyScottVisualizer server listening on port ${port}`)
})