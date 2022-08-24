window.esvServiceUrl = 'http://localhost:3000'

const helpTextAlphabetWords = "Words with spaces between";
const helpTextAlphabetLetters = "Letters with spaces";
const helpTextTokensWords = helpTextAlphabetWords;
const helpTextTokensLetters = "Letters without spaces";
const helpTextGrammarLetters = "Create grammar on the form S => ab|aA with linebreaks between"
                                + " each production. RHS are characters.";
const helpTextGrammarWords = "Create grammar on the form S => word1 word2 | word2 A with"
                             + " linebreaks between each production. RHS are words and"
                             + " single uppercase characters are non-terminals if found on LHS" 
                             + " of a production.";

let readyToParse = true;    // To know how to continue (Start again if done or continue when in middle of parsing)
let getStatusTimeout;        // To know what timeout to send to clearTimeout when pausing
let createParserTimeout;
let currentStep;    // To know what step number to send to getStatus after pausing

let SPPFnodes = new Set();  // This set contains all SPPF nodes that comes through queue V from the server
                            // and will be used to render them to the user gradually.

window.addEventListener("load", () => {
    document.getElementById("alphabet").setAttribute("placeholder", helpTextAlphabetLetters);
    document.getElementById("tokens").setAttribute("placeholder", helpTextTokensLetters);
    document.getElementById("grammar").setAttribute("placeholder", helpTextGrammarLetters);
}, false);

window.addEventListener("resize", () => {
    // Position the buttons in a fixed and accessible location so the user can scoll down and still access the buttons
    let tokens = document.getElementById("tokens2");
    let rect = tokens.getBoundingClientRect();
    let ctrlButtons = document.getElementById("ctrlButtons");
    ctrlButtons.style.left = rect.left + "px";
});

function testConnection()
{
    //Perform an AJAX POST request to the url
    axios.post(window.esvServiceUrl + '/api/v1/testpost', { 
        'id': 9,
        'value': 19
    })
        .then(function (response) {
            //When successful, print 'Success: ' and the received data
            if(response.data[0].result == 'OK')
            {
                alert("OK");
            }
        })
        .catch(function (error) {
            //When unsuccessful, print the error.
            showErrorMessage(error);
        });
}

function validatePrepareAndSend()
{
    const alphabetStr = document.getElementById("alphabet").value;
    const tokenStr = document.getElementById("tokens").value;
    const grammarText = document.getElementById("grammar").value;
    const areWords = document.getElementById("areWords").checked;

    let errorpanel = document.getElementById("errorpanel");
    errorpanel.childNodes.forEach(c => {
        if(c.tagName == 'P')
        {
            errorpanel.removeChild(c);
        }
    });

    // TODO: Validate input with words == true. Skipping that for now.
    let isValid = validateAlphabetStr(alphabetStr, areWords) && validateStringToParse(tokenStr, alphabetStr, areWords) && validateGrammar(grammarText);
    
    if(isValid)
    {
        let errorpanel = document.getElementById("errorpanel");
        errorpanel.setAttribute("hidden", "true");
        reqObj = new RequestObject(alphabetStr, tokenStr, grammarText, areWords);
        
        sendParseRequest(reqObj);
        
        let queuesAndSets = document.getElementById("queuesAndSets");
        queuesAndSets.removeAttribute("hidden");

        let mainform = document.getElementById("mainform");
        mainform.setAttribute("hidden", "true");

        let continueOrStartButton = document.getElementById("btnContinueOrStartAgain");
        continueOrStartButton.textContent = "Continue";
        continueOrStartButton.disabled = true;
        readyToParse = false;

        let earleySetsRow = document.getElementById("earleySets");

        // Start with deleting old elements
        let children = earleySetsRow.childNodes;
        if(children.length > 0)
        {
            for(let k = children.length - 1; k > -1; k--)
            {
                earleySetsRow.removeChild(children[k]);
            }
        }

        for(let i = 0; i <= reqObj.tokenStringGetter.length; i++) // here we want to have one more earley sets than the length so i <= is correct here
        { 
            // TODO: Handle nicely when we have strings of more than length 12 - currently we can have max 12 within the bootstrap layout.
            let divEi = document.createElement("div");
            divEi.classList.add("col");
            divEi.setAttribute("id", "E" + i);

            let h2 = document.createElement("h2");
            let sub = document.createElement("sub");
            let textE = document.createTextNode("E");
            let textNum = document.createTextNode(i);

            sub.append(textNum);
            h2.append(textE);
            h2.append(sub);
            divEi.append(h2);

            earleySetsRow.append(divEi);
        }

        // Position the buttons in a fixed and accessible location so the user can scoll down and still access the buttons
        let tokens = document.getElementById("tokens2");
        let rect = tokens.getBoundingClientRect();
        let ctrlButtons = document.getElementById("ctrlButtons");
        ctrlButtons.style.left = rect.left + "px";
    }

}
let parsingDone = false;

function sendParseRequest(reqObj)
{
    let jsonObj = JSON.stringify(reqObj);
    console.log(jsonObj);
    //Perform an AJAX POST request to the url
    axios.post(window.esvServiceUrl + '/api/v1/createParser', {
        "alphabet": reqObj.alphabet,
        "tokenString": reqObj.tokenString,
        "grammar": reqObj.grammar
    })
    .then(function (response) {

        // Initialize infopanel
        let infopanel = document.getElementById("infopanel");

        // Remove old items
        removeOldItems(infopanel, "P");

        let p = document.createElement("p");
        let text = document.createTextNode("Parsing started.");
        p.append(text)
        p.classList.add("text-center");

        // Create the step counter
        let pStep = document.createElement("p");
        let textStep = document.createTextNode("Step 0");
        pStep.append(textStep)
        pStep.classList.add("text-center");
        pStep.setAttribute("id", "stepCount");

        // Append elements
        infopanel.appendChild(p);
        infopanel.appendChild(pStep);

        // Show tokens and grammar
        let tokensCol = document.getElementById("tokens2");
        let grammarCol = document.getElementById("grammar2");

        // Remove old items
        removeOldItems(tokensCol, "P");
        removeOldItems(grammarCol, "P");

        let pTokens = document.createElement("p");
        let textTokens = document.createTextNode(reqObj.tokenString.join(" "));
        pTokens.append(textTokens);
        tokensCol.appendChild(pTokens);

        reqObj.grammarGetter.forEach(production => {
            let pProduction = document.createElement("p");
            pProduction.classList.add("mb-1");
            let rewrittenProduction;
            production.forEach((item, ix) => {
                let noSpaceItem = item.split(" ").join("");
                if(ix == 0) rewrittenProduction = noSpaceItem + " ::= ";
                else 
                {
                    if(ix == production.length - 1) rewrittenProduction += noSpaceItem;
                    else rewrittenProduction += noSpaceItem + "|";
                }
            });
            let textProduction = document.createTextNode(rewrittenProduction);
            pProduction.append(textProduction);
            grammarCol.appendChild(pProduction);
        });

        let abortButton = document.getElementById("btnAbort")
        abortButton.disabled = false;  
        getStatusTimeout = setTimeout(() => getStatus(0, 1000), 1000);     
    })
    .catch(function (error) {

        if(error.hasOwnProperty('response') && error.response.hasOwnProperty('status') && error.response.status == 425)
        {
            console.log(error.response.data[0].result);
            createParserTimeout = setTimeout(() => sendParseRequest(reqObj), 1000);
            return;
        }

        //When unsuccessful, print the error.
        let errorpanel = document.getElementById("errorpanel");
        let p = document.createElement("p");
        let text = document.createTextNode(error);
        p.append(text);
        p.classList.add("text-center");
        errorpanel.appendChild(p);
        errorpanel.removeAttribute("hidden")
        parsingDone = true;
        abort();
    });
}

function getStatus(step, ms)
{
    // console.log("Get status called");
    // Perform an AJAX POST request to the url

    axios.get(window.esvServiceUrl + '/api/v1/getStatus/' + step, {})
        .then(function (response) {
            //console.log(response);
            let pStep = document.getElementById("stepCount");
            if(response.data[0].Final == "") 
            {
                getStatusTimeout = setTimeout(() => getStatus(response.data[0].step + 1, ms), ms);

                if(pStep) pStep.textContent = "Step " + step;
                currentStep = step;

                populateEarleySets(response.data[0].E);
                populateOtherSets('Qset', response.data[0].Q);
                populateOtherSets('QmarkedSet', response.data[0].Qmarked);
                populateOtherSets('Rset', response.data[0].R);
                populateOtherSets('Vset', response.data[0].V);
                populateOtherSets('Hset', response.data[0].H);
                addToSPPFnodes(response.data[0].V_withNodes);
            }
            else
            {
                if(pStep) pStep.textContent = "Step " + step;

                let infopanel = document.getElementById("infopanel");
                // Parsing started
                let p = document.createElement("p");
                let text = document.createTextNode("Parsing done. Result: " + response.data[0].Final);
                p.append(text)
                p.classList.add("text-center");
                infopanel.appendChild(p);
                console.log("Done.");

                let continueOrStartButton = document.getElementById("btnContinueOrStartAgain");
                continueOrStartButton.textContent = "Start again";
                continueOrStartButton.disabled = false;
                readyToParse = true;

                let abortButton = document.getElementById("btnAbort")
                abortButton.disabled = true;
            }
        })
        .catch(function (error) {   

            if(error.hasOwnProperty('response') && error.response.hasOwnProperty('status') && error.response.status == 425)
            {
                console.log(error.response.result);
                console.log(error.response.outcome);
                console.log("Lengthening time to " + ms * 2 + "ms.");
                getStatusTimeout = setTimeout(() => getStatus(step, ms * 2), ms * 2);
                return;
            }

            clearTimeout(getStatusTimeout);

            //When unsuccessful, print the error.
            console.log(error);
            let errorpanel = document.getElementById("errorpanel");
            let p = document.createElement("p");
            let text = document.createTextNode(error);
            p.append(text);
            p.classList.add("text-center");
            errorpanel.appendChild(p);
            errorpanel.removeAttribute("hidden");
            abort();
        });
}

function showErrorMessage(message)
{
    alert(message);
}

function handleChange(checkbox)
{
    if(checkbox.checked == true)
    {
        document.getElementById("alphabet").setAttribute("placeholder", helpTextAlphabetWords);
        document.getElementById("tokens").setAttribute("placeholder", helpTextTokensWords);
        let grammarInput = document.getElementById("grammar");
        grammarInput.setAttribute("placeholder", helpTextGrammarWords);
        grammarInput.style.height = "8em";
    }
    else
    {
        document.getElementById("alphabet").setAttribute("placeholder", helpTextAlphabetLetters);
        document.getElementById("tokens").setAttribute("placeholder", helpTextTokensLetters);
        let grammarInput = document.getElementById("grammar");
        grammarInput.setAttribute("placeholder", helpTextGrammarLetters);
        grammarInput.style.height = "4em";
    }
}

function validateAlphabetStr(alphabetStr, areWords)
{
    let errorpanel = document.getElementById("errorpanel");
    let p = document.createElement("p");

    if(!alphabetStr.includes(" ") && alphabetStr.length > 1 && areWords == false)
    {
        let text = document.createTextNode("Alphabet does not have spaces between tokens.")
        p.append(text);
        p.classList.add("text-center");
        errorpanel.appendChild(p);
        errorpanel.removeAttribute("hidden")
        return false;
    }

    let isValid = true
    
    let tokens = alphabetStr.split(" ");
    for(let i = 0; i < tokens.length; i++)
    {
        if(tokens[i].length > 1 && tokens[i] != "eps") 
        {
            let text = document.createTextNode("Please put in single characters for the alphabet.")
            p.append(text);
            p.classList.add("text-center");
            errorpanel.appendChild(p);
            errorpanel.removeAttribute("hidden")
            return false;
        }
    };

    return true;
}

function validateStringToParse(stringToParse, alphabetStr, areWords)
{
    tokens = stringToParse.split("");
    if(!areWords)
    {
        for(var i=0; i < tokens.length; i++)
        {
            if(!alphabetStr.includes(tokens[i]))
            {
                let errorpanel = document.getElementById("errorpanel");
                let p = document.createElement("p");
                let text = document.createTextNode("String includes a token not in alphabet.")
                p.append(text);
                p.classList.add("text-center");
                errorpanel.appendChild(p);
                errorpanel.removeAttribute("hidden")
                return false;
            }
        }
    }

    return true;
}

function validateGrammar(grammar)
{
    let errorpanel = document.getElementById("errorpanel");

    if(!grammar.includes("=>"))
    {
        let p = document.createElement("p");
        let text = document.createTextNode("Grammar must include an arrow => to denote a production.")
        p.append(text);
        p.classList.add("text-center");
        errorpanel.appendChild(p);
        errorpanel.removeAttribute("hidden");
        return false;
    }

    lines = grammar.split("\n");
    if(lines[0].split("=>")[0].trim() != "S")
    {
        let p = document.createElement("p");
        let text = document.createTextNode("Grammar must start with a start variable denoted with S => [some terminals and non-terminals].");
        p.append(text);
        p.classList.add("text-center");
        errorpanel.appendChild(p);
        errorpanel.removeAttribute("hidden")
        return false;
    }

    return true;
}

class RequestObject
{
    constructor(alphabet, tokenStr, grammarText, areWords)
    {
        this.alphabet = alphabet.split(" ");

        if(areWords)
        {
            this.tokenString = tokenStr.split(" ");
        }
        else
        {
            this.tokenString = tokenStr.split("");
        }
        let lines = grammarText.split("\n");
        this.grammar = [];
        lines.forEach(line => {
            let production = line.split("=>");
            let lhs = production[0].trim();
            let rhs = production[1].trim().split("|");
            let newArray = [];
            newArray.push(lhs);
            rhs.forEach(item => {
                if(item === "eps")
                {
                    newArray.push(item.trim());
                }
                else
                {
                    newArray.push(item.trim().split("").join(" "));
                }
            });
            this.grammar.push(newArray);
        });
    }

    get tokenStringGetter()
    {
        return this.tokenString;
    }

    set tokenStringSetter(str)
    {
        this.tokenString = str;
    }

    get grammarGetter()
    {
        return this.grammar;
    }
}

function populateEarleySets(theArrayOfArrays)
{
    if(theArrayOfArrays.length == 0) 
    {
        // The algorithm is in its early stages and therefor empty.
        return;
    }

    for(let i = 0; i < theArrayOfArrays.length; i++) // Here we have the correct length from the parser so i < is correct.
    {
        let Ei = document.getElementById("E" + i);

        // Start with deleting old elements
        if(Ei.childNodes)
        {
            let children = Ei.childNodes;
            for(let k = children.length - 1; k > -1; k--)
            {
                if(children[k].nodeName == "P")
                {
                    Ei.removeChild(children[k]);
                }
            }
        }

        for(let j = 0; j < theArrayOfArrays[i].length; j++)
        {
            let p = document.createElement("p");
            let text = document.createTextNode(theArrayOfArrays[i][j]);
            p.append(text);
            Ei.appendChild(p);
        }
    }
}

function populateOtherSets(id, theArray)
{
    let rset = document.getElementById(id);

    // Start with deleting old elements
    let children = rset.childNodes;
    for(let k = children.length - 1; k > 0; k--)
    {
        rset.removeChild(children[k]);
    }

    for(let j = 0; j < theArray.length; j++)
    {
        let span = document.createElement("span");
        let text = document.createTextNode(theArray[j]);
        span.append(text);
        rset.appendChild(span);
    }
}

function addToSPPFnodes(theArray)
{
    let orgSize = SPPFnodes.size;

    theArray.forEach(item => {
        SPPFnodes.add(item)
    });

    let newSize = SPPFnodes.size;

    if(newSize > orgSize) renderNodes();
}

function abort()
{
    clearTimeout(getStatusTimeout);
    clearTimeout(createParserTimeout);
    readyToParse = true;
    //Perform an AJAX POST request to the url
    axios.delete(window.esvServiceUrl + '/api/v1/abort')
        .then(function (response) {
            alert(response.data[0].result);
    
            let mainform = document.getElementById("mainform");
            mainform.removeAttribute("hidden");

            let queuesAndSets = document.getElementById("queuesAndSets");
            queuesAndSets.setAttribute("hidden", "true");
        })
        .catch(function (error) {
            //When unsuccessful, print the error.
            showErrorMessage(error);
        });
}

function cont()
{
    if(readyToParse) // Parsing is done, we want to go again
    {
        // Go back to the form
        let queuesAndSets = document.getElementById("queuesAndSets");
        queuesAndSets.setAttribute("hidden", "true");

        let mainform = document.getElementById("mainform");
        mainform.removeAttribute("hidden");
    }
    else // We were parsing but paused
    {
        // Continue with the parsing
        getStatusTimeout = setTimeout(() => getStatus(currentStep + 1, 1000), 1000);

    }
}

function pause()
{
    clearTimeout(getStatusTimeout);
    let continueOrStartButton = document.getElementById("btnContinueOrStartAgain");
    continueOrStartButton.textContent = "Continue";
    continueOrStartButton.disabled = false;
}

function removeOldItems(parent, typeToRemove)
{
    // Start with deleting old elements
    if(parent.childNodes)
    {
        let children = parent.childNodes;
        for(let k = children.length - 1; k > -1; k--)
        {
            if(children[k].nodeName == typeToRemove)
            {
                parent.removeChild(children[k]);
            }
        }
    }

}