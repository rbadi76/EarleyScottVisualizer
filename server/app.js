
const express = require('express');
const app = express();
const cors = require('cors'); 

const bodyParser = require('body-parser');
const { EarleyScott } = require('./earley-scott');
let parseStatus = require('./parseStatusM');

app.use(bodyParser.urlencoded({ limit: '5mb', extended: true }));
app.use(bodyParser.json({ limit: '5mb' }));
app.use(cors());

const port = process.env.PORT || 3000;

function sleep(ms) {
    return new Promise(
        resolve => setTimeout(resolve, ms)
    );

}

let counter = 0;
let mayContinue = false;

async function sleepXTimes(n)
{
    counter = n;
    if(n == 0)
    {
        console.log("n = 0 now so I'll stop.");
        return;
    } 
    
    if(mayContinue == false) 
    {
        console.log("Going to sleep. Counter at " + counter);
        await sleep(1000);
        console.log("Awake again, calling sleepXTimes with n = " + n);
        setImmediate(() => sleepXTimes(n));
    }
    else
    {
        console.log("Can continue, calling sleepXTimes with n = " + (n - 1));
        mayContinue = false;
        setImmediate(() => sleepXTimes(n - 1));
    }
}

app.post('/api/v1/testpost', (req, res) => {
    console.log("Testpost called");
    //setImmediate(() => sleepXTimes(10));
    sleepXTimes(10);

    let respArray = [];
    respArray.push({ status: 'Process started' });
    return res.status(200).json(respArray);
});

app.get('/api/v1/testget', (req, res) => {
    console.log("testget called");
    let respArray = [];
    respArray.push({ Counter: counter });
    mayContinue = true;
    return res.status(200).json(respArray);
});

/*
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
    
});*/ 

app.post('/api/v1/createParser', (req, res) => {
    let respArray = [];
    try{
        alphabet = req.body.alphabet;
        tokenString = req.body.tokenString;
        grammar = req.body.grammar;

        console.log(`Got alphabet ${req.body.alphabet}, tokenstring  ${req.body.tokenString} and grammar ${req.body.grammar}`);

        let earleyScott = new EarleyScott(tokenString, alphabet, grammar);
        //let outcome = earleyScott.parse();

        let outcome = earleyScott.parseAsync1();

        respArray.push({ result: outcome});
        return res.status(200).json(respArray);
    }
    catch(error)
    {
        console.log(error);
        respArray.push({ result: 'Error', error: 'Internal server error'});
        return res.status(500).json(respArray);
    }
});

app.get('/api/v1/getStatus/:step', (req, res) => {
    let respArray = [];
    try
    {
        //console.log("Server getStatus called. This is the beginning.");
        let currentStep = parseStatus.parseStatus.getCurrentStep();
        if(parseStatus.parseStatus.isInStopState())
        {
            // Todo: Figure out how to send and receive step number from client, i.e. data format.
            // This if-clause indicates that data has not been received before. Get the data here.
            respArray.push(
                {   result: 'Parsing updated', 
                    step: currentStep,
                    Q: parseStatus.parseStatus.Q,
                    R: parseStatus.parseStatus.R,
                    V: parseStatus.parseStatus.V,
                    Qmarked: parseStatus.parseStatus.Qmarked,
                    H: parseStatus.parseStatus.H,
            });
            parseStatus.parseStatus.incrementNextStepToShow();
            //console.log("Server getStatus called: New state retrieved.");
        }
        else
        {
            // otherwise tell client that data is the same as before or resend it depending on testing.
            respArray.push(
                {   result: 'Algorithm busy', 
                    step: currentStep,
            });
            //console.log("Server getStatus called: No change to parsing.");
        }

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