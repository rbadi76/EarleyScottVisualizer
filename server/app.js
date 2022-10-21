
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

app.post('/api/v1/createParser', (req, res) => {
    let respArray = [];
    try{
        alphabet = req.body.alphabet;
        tokenString = req.body.tokenString;
        grammar = req.body.grammar;

        console.log(`Got alphabet ${req.body.alphabet}, tokenstring  ${req.body.tokenString} and grammar ${req.body.grammar}`);

        let outcome;
        if(!parseStatus.parseStatus.parsingInProgress())
        {
            let earleyScott = new EarleyScott(tokenString, alphabet, grammar);
            earleyScott.parseAsync1(1);
            outcome = "Parsing started.";
            respArray.push({ result: outcome});
            return res.status(201).json(respArray);
        }
        else
        {
            outcome = "Sorry - parser is busy with another job, please try later.";
            respArray.push({ result: outcome});
            return res.status(425).json(respArray);
        }
        
        
    }
    catch(error)
    {
        console.log(error);
        respArray.push({ result: 'Error', error: 'Internal server error'});
        return res.status(500).json(respArray);
    }
});

app.post('/api/v1/parseToEnd', (req, res) => {
    let respArray = [];

    try{
        alphabet = req.body.alphabet;
        tokenString = req.body.tokenString;
        grammar = req.body.grammar;

        console.log(`Got alphabet ${req.body.alphabet}, tokenstring  ${req.body.tokenString} and grammar ${req.body.grammar}`);

        let earleyScott = new EarleyScott(tokenString, alphabet, grammar);
        let result = earleyScott.parse();
        respArray.push(
            {   result: result.toString(), 
                step: 1,
                Q: parseStatus.parseStatus.getQ(),
                R: parseStatus.parseStatus.getR(),
                V: parseStatus.parseStatus.getV(),
                Qmarked: parseStatus.parseStatus.getQmarked(),
                E: parseStatus.parseStatus.getE(),
                H: parseStatus.parseStatus.getH(),
                Final: parseStatus.parseStatus.getFinal(),
                V_withNodes: parseStatus.parseStatus.getVWithFamilies(),
                description: parseStatus.parseStatus.getDescription()
        });

        parseStatus.parseStatus.abort();
        parseStatus.parseStatus.setParsingDone();
        return res.status(201).json(respArray);    
    }
    catch(error)
    {
        console.log(error);
        respArray.push({ result: 'Error', error: 'Internal server error'});
        return res.status(500).json(respArray);
    }
});

app.delete('/api/v1/abort', (req, res) => {
    let respArray = [];
    try{
        parseStatus.parseStatus.abort();
        parseStatus.parseStatus.setParsingDone();
        outcome = "Parsing aborted, or rather is allowed to finish quickly.";
        respArray.push({ result: outcome});
        return res.status(201).json(respArray);
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
        if(!parseStatus.parseStatus.parsingInProgress())
        {
            respArray.push(
                {   
                    result: 'Parsing has not started yet. Plase call createParser first.', 
                }
            );
            return res.status(425).json(respArray);
        }
        //console.log("Server getStatus called. This is the beginning.");
        let currentStep = parseStatus.parseStatus.getCurrentStep();
        if(parseStatus.parseStatus.isInStopState())
        {
            // Todo: Figure out how to send and receive step number from client, i.e. data format.
            // This if-clause indicates that data has not been received before. Get the data here.
            respArray.push(
                {   result: 'Parsing updated', 
                    step: currentStep,
                    Q: parseStatus.parseStatus.getQ(),
                    R: parseStatus.parseStatus.getR(),
                    V: parseStatus.parseStatus.getV(),
                    Qmarked: parseStatus.parseStatus.getQmarked(),
                    E: parseStatus.parseStatus.getE(),
                    H: parseStatus.parseStatus.getH(),
                    Final: parseStatus.parseStatus.getFinal(),
                    V_withNodes: parseStatus.parseStatus.getVWithFamilies(),
                    description: parseStatus.parseStatus.getDescription()
            });
            parseStatus.parseStatus.incrementNextStepToShow();
            if(parseStatus.parseStatus.getFinal() != "")
            {
                parseStatus.parseStatus.setParsingDone();
                //parseStatus.parseStatus.resetParseStatus();
            }
            //console.log("Server getStatus called: New state retrieved.");
            return res.status(202).json(respArray);
        }
        else
        {
            // otherwise tell client that data is the same as before or resend it depending on testing.
            respArray.push(
                {   result: 'Algorithm busy', 
                    step: currentStep,
            });
            //console.log("Server getStatus called: No change to parsing.");
            return res.status(425).json(respArray);
        }
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