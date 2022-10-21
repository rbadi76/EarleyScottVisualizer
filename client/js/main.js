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

const  SPPF_NODES_AREA_PADDING_ALL = 16;
const TIMEOUT = 500; // Initial timeout interval for getStatus requests

let readyToParse = true;    // To know how to continue (Start again if done or continue when in middle of parsing)
let getStatusTimeout;        // To know what timeout to send to clearTimeout when pausing
let createParserTimeout;
let currentStep;    // To know what step number to send to getStatus after pausing

let SPPFnodes = new Map();  // This set contains all SPPF nodes that comes through queue V from the server
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

function validatePrepareAndSend(stepByStep)
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

    let isValid = validateAlphabetStr(alphabetStr, areWords) && validateStringToParse(tokenStr, alphabetStr, areWords) && validateGrammar(grammarText);
    
    if(isValid)
    {
        let errorpanel = document.getElementById("errorpanel");
        errorpanel.setAttribute("hidden", "true");
        reqObj = new RequestObject(alphabetStr, tokenStr, grammarText, areWords);
        
        sendParseRequest(reqObj, stepByStep);
        
        let queuesAndSets = document.getElementById("queuesAndSets");
        queuesAndSets.removeAttribute("hidden");

        let mainform = document.getElementById("mainform");
        mainform.setAttribute("hidden", "true");

        if(stepByStep)
        {
            let continueOrStartButton = document.getElementById("btnContinueOrStartAgain");
            continueOrStartButton.textContent = "Continue";
            continueOrStartButton.disabled = true;
            readyToParse = false;
        }
        else
        {
            let continueOrStartButton = document.getElementById("btnContinueOrStartAgain");
            continueOrStartButton.textContent = "Start again";
            continueOrStartButton.disabled = false;
            readyToParse = true;
        }

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

            let h4 = document.createElement("h4");
            let sub = document.createElement("sub");
            let textE = document.createTextNode("E");
            let textNum = document.createTextNode(i);

            sub.append(textNum);
            h4.append(textE);
            h4.append(sub);
            divEi.append(h4);

            earleySetsRow.append(divEi);
        }

        // Position the buttons in a fixed and accessible location so the user can scoll down and still access the buttons
        let tokens = document.getElementById("tokens2");
        let rect = tokens.getBoundingClientRect();
        let ctrlButtons = document.getElementById("ctrlButtons");
        ctrlButtons.style.left = rect.left + "px";

        // Remove old trees if they were shown previously
        removeOldTrees();

        // Set the size of the SVG for the nodes
        let widthOfSPPFnodesArea = document.getElementById("SPPFnodesArea").offsetWidth
        let svgArea = document.getElementById(SVG_IMG_ID);
        svgArea.setAttribute("width", widthOfSPPFnodesArea - 30);
    }

}

let parsingDone = false;

function sendParseRequest(reqObj, stepByStep)
{
    let jsonObj = JSON.stringify(reqObj);

    let restMethod = "/api/v1/parseToEnd";
    if(stepByStep) restMethod = "/api/v1/createParser";

    //Perform an AJAX POST request to the url
    axios.post(window.esvServiceUrl + restMethod, {
        "alphabet": reqObj.alphabet,
        "tokenString": reqObj.tokenString,
        "grammar": reqObj.grammar
    })
    .then(function (response) {

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
        let continueOrStartButton = document.getElementById("btnContinueOrStartAgain");
        let pauseButton = document.getElementById("btnPause");

        // Initialize infopanel
        let infopanel = document.getElementById("infopanel");

        // Remove old items
        removeOldItems(infopanel, "P");
        
        if(stepByStep)
        { 
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

            // Create description line.
            let pDescription = document.createElement("p");
            let textDescription = document.createTextNode("Initializing");
            pDescription.append(textDescription);
            pDescription.classList.add("text-center");
            pDescription.setAttribute("id", "codeDescription");

            // Append elements
            infopanel.appendChild(p);
            infopanel.appendChild(pStep);
            infopanel.appendChild(pDescription);

            abortButton.disabled = false;
            pauseButton.disabled = false;
            continueOrStartButton.disabled = true;
            pauseButton.disabled = false;
            continueOrStartButton
            SPPFnodes = new Map();
            getStatusTimeout = setTimeout(() => getStatus(0, TIMEOUT), TIMEOUT);  
        }  
        else
        {
            let p = document.createElement("p");
            let text = document.createTextNode("Parsing done. SPPF cannot be shown with this method of parsing.");
            p.append(text)
            p.classList.add("text-center");

            // Create description line.
            let pDescription = document.createElement("p");
            let textDescription = document.createTextNode(response.data[0].result);
            pDescription.append(textDescription);
            pDescription.classList.add("text-center");
            pDescription.setAttribute("id", "codeDescription");

            // Append elements
            infopanel.appendChild(p);
            infopanel.appendChild(pDescription);

            abortButton.disabled = true;
            pauseButton.disabled = true;
            continueOrStartButton.disabled = false;
            continueOrStartButton.textContent = "Parse again";
            populateEarleySets(response.data[0].E);
            populateOtherSets('Qset', response.data[0].Q);
            populateOtherSets('QmarkedSet', response.data[0].Qmarked);
            populateOtherSets('Rset', response.data[0].R);
            populateOtherSets('Vset', response.data[0].V);
            populateOtherSets('Hset', response.data[0].H);
            addToSPPFnodes(response.data[0].V_withNodes);
        } 
    })
    .catch(function (error) {

        if(error.hasOwnProperty('response') && error.response.hasOwnProperty('status') && error.response.status == 425)
        {
            console.log(error.response.data[0].result);
            createParserTimeout = setTimeout(() => sendParseRequest(reqObj), TIMEOUT);
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
    // Perform an AJAX POST request to the url
    axios.get(window.esvServiceUrl + '/api/v1/getStatus/' + step, {})
        .then(function (response) {
            let pStep = document.getElementById("stepCount");
            let pDescription = document.getElementById("codeDescription");
            if(response.data[0].Final == "") 
            {
                getStatusTimeout = setTimeout(() => getStatus(response.data[0].step + 1, ms), ms);

                if(pStep) pStep.textContent = "Step " + step;
                currentStep = step;

                if(pDescription) pDescription.textContent = response.data[0].description;

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

                let pauseButton = document.getElementById("btnPause");
                pauseButton.disabled = true;
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
    if(!alphabetStr.includes(" ") && alphabetStr.length > 1 && areWords == false)
    {
        let text = document.createTextNode("Alphabet does not have spaces between tokens.")
        addToErrorPanel(text);
        return false;
    }

    if(areWords && !alphabetStr.includes(" "))
    {
        let text = document.createTextNode("Alphabet must have more than one word with spaces in between.")
        addToErrorPanel(text);
        return false;
    }
    
    let tokens = alphabetStr.split(" ");
    if(!areWords)
    {
        for(let i = 0; i < tokens.length; i++)
        {
            if(tokens[i].length > 1 && tokens[i] != "eps") 
            {
                let text = document.createTextNode("Please put in single characters for the alphabet.")
                addToErrorPanel(text);
                return false;
            }
        };
    }

    return true;
}

function addToErrorPanel(text) {
    let errorpanel = document.getElementById("errorpanel");
    let p = document.createElement("p");
    p.append(text);
    p.classList.add("text-center");
    errorpanel.appendChild(p);
    errorpanel.removeAttribute("hidden");
}

function validateStringToParse(stringToParse, alphabetStr, areWords)
{
    
    if(!areWords)
    {
        tokens = stringToParse.split("");
        for(var i=0; i < tokens.length; i++)
        {
            if(!alphabetStr.includes(tokens[i]))
            {
                let text = document.createTextNode("String includes a token not in alphabet.")
                addToErrorPanel(text);
                return false;
            }
        }
    }

    if(areWords)
    {
        tokens = stringToParse.split(" ");
        for(var i=0; i < tokens.length; i++)
        {
            if(!alphabetStr.includes(tokens[i]))
            {
                let text = document.createTextNode("String includes a token not in alphabet.")
                addToErrorPanel(text)
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
                    if(areWords)
                    {
                        newArray.push(item.trim().split(" ").join(" "));
                    }
                    else
                    {
                        newArray.push(item.trim().split("").join(" "));
                    }
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
    let sppfNodesHaveChanged = false;
    theArray.forEach(node => {

        let newNode = new SPPFnode(node[0], node[1], node[2]);
        if(!SPPFnodes.has(newNode.toString())) // The node has not been added yet to the node map
        {
            if(node.length > 3) // node[3] is the array of families - there are families existing
            {
                newNode = getFamiliesFromV_withNodesArray(node[3], newNode);
            }
            SPPFnodes.set(newNode.toString(), newNode);
            sppfNodesHaveChanged = true;

        }
        else // The node is already in the node map, check if it is the same, if not swap it out.
        {
            let existingNode = SPPFnodes.get(newNode.toString());
            let newNodeWithArrays = getFamiliesFromV_withNodesArray(node[3], newNode);
            if(existingNode.familiesCount != newNodeWithArrays.familiesCount)
            {
                SPPFnodes.set(newNode.toString(), newNodeWithArrays);
                sppfNodesHaveChanged = true;
            }
            else
            {
                let sameness = true;
                for(const family of newNodeWithArrays.families)
                {
                    if(!existingNode.families.has(family[1].getKey()) && (family instanceof BinaryFamily ? !existingNode.families.has(family[1].getReverseKey()) : true))
                    {
                        sameness = false;
                        break;
                    }
                }
                if(!sameness) 
                {
                    SPPFnodes.set(newNode.toString(), newNodeWithArrays);
                    sppfNodesHaveChanged = true;
                }
                // Else do nothing.
            }
        }  
    });

    if(sppfNodesHaveChanged)
    {
        let SPPF_trees = determineCurrentSPPFstructure();

        removeOldTrees()
        drawTrees(SPPF_trees);
    }
}

function drawTrees(SPPF_trees) {
    let parentNodeArea = document.getElementById("SPPFnodesArea");
    let svgArea = new SVG_area(parentNodeArea.offsetWidth - (SPPF_NODES_AREA_PADDING_ALL * 2));
    let treeAreaRow = new TreeAreaRow();
    svgArea.addTreeAreaRow(treeAreaRow);
    let treeCounter = 1;
    SPPF_trees.forEach(tree => {
        let treeArea = new TreeArea(tree, treeCounter);
        if(svgArea.lastTreeAreaRow.treeCount == 0)
        {
            svgArea.lastTreeAreaRow.addTreeArea(treeArea);
        }
        else
        {
            if(svgArea.lastTreeAreaRow.availableWidth >= treeArea.width)
            {
                svgArea.lastTreeAreaRow.addTreeArea(treeArea);
            }
            else
            {
                let newTreeAreaRow = new TreeAreaRow();
                newTreeAreaRow.addTreeArea(treeArea);
                svgArea.addTreeAreaRow(newTreeAreaRow);
            }
        }
        treeCounter++;
    });

    svgArea.render();

}

function removeOldTrees()
{
    let svgArea = document.getElementById(SVG_IMG_ID);
    svgArea.innerHTML = "";
}

function getFamiliesFromV_withNodesArray(familiesArray, newNode)
{
    //let familiesMap = new Map();
    familiesArray.forEach(family => {
        let newFamily;
        if(family.length == 1) // Unary node
        {
            newFamily = new UnaryFamily(new SPPFnode(family[0][0], family[0][1], family[0][2]));            
        }
        else if(family.length == 2) // Binary node
        {
            newFamily = new BinaryFamily(new SPPFnode(family[0][0], family[0][1], family[0][2]), new SPPFnode(family[1][0], family[1][1], family[1][2]));
        }
        else
        {
            throw new Error("Server sent a family into V_withNodes that is neither unary nor binary. This is not supposed to be possible.");
        }
        newNode.addFamily(newFamily);
    });
    return newNode;
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
        getStatusTimeout = setTimeout(() => getStatus(currentStep + 1, TIMEOUT), TIMEOUT);

        let continueOrStartButton = document.getElementById("btnContinueOrStartAgain");
        continueOrStartButton.textContent = "Continue";
        continueOrStartButton.disabled = true;

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