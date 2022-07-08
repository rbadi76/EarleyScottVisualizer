
const express = require('express');
const app = express();
const cors = require('cors'); 

const bodyParser = require('body-parser');
const { EarleyScott } = require('./earley-scott');
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

app.post('/api/v1/createParser', (req, res) => {
    let respArray = [];
    try{
        alphabet = req.body.alphabet;
        tokenString = req.body.tokenString;
        grammar = req.body.grammar;

        console.log(`Got alphabet ${req.body.alphabet}, tokenstring  ${req.body.tokenString} and grammar ${req.body.grammar}`);

        let earleyScott = new EarleyScott(tokenString, alphabet, grammar);
        let outcome = earleyScott.parse();


        respArray.push({ result: 'Correct'});
        return res.status(200).json(respArray);
    }
    catch(error)
    {
        console.log(error);
        respArray.push({ result: 'Error', error: 'Internal server error'});
        return res.status(500).json(respArray);
    }
});
   
app.listen(port, () => {
    console.log(`EarleyScottVisualizer server listening on port ${port}`)
});