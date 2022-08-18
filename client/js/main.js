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

window.addEventListener("load", () => {
    document.getElementById("alphabet").setAttribute("placeholder", helpTextAlphabetLetters);
    document.getElementById("tokens").setAttribute("placeholder", helpTextTokensLetters);
    document.getElementById("grammar").setAttribute("placeholder", helpTextGrammarLetters);
}, false);

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

        let earleySetsRow = document.getElementById("earleySets");
        for(let i = 0; i <= reqObj.tokenStringGetter.length; i++) // here we want to have one more earley sets than the length so i <= is correct here
        {
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
            let infopanel = document.getElementById("infopanel");
            let p = document.createElement("p");
            let text = document.createTextNode("Parsing started.");
            p.append(text)
            p.classList.add("text-center");
            infopanel.appendChild(p);
            infopanel.removeAttribute("hidden");
                    
        })
        .catch(function (error) {

            if(error.hasOwnProperty('response') && error.response.hasOwnProperty('status') && error.response.status == 425)
            {
                console.log(error.response.result);
                setTimeout(() => getStatus(0, 1000), 1000);
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
        })
        .then(function(){
            //console.log("Last then in axios post.");
            setTimeout(() => getStatus(0, 1000), 1000);
        });
}

function getStatus(step, ms)
{
    console.log("Get status called");
    //Perform an AJAX POST request to the url

    let timeout;
    axios.get(window.esvServiceUrl + '/api/v1/getStatus/' + step, {})
        .then(function (response) {
            console.log(response);
            if(response.data[0].Final == "") 
            {
                timeout = setTimeout(() => getStatus(response.data[0].step + 1, ms), ms);
                populateEarleySets(response.data[0].E);
                populateTheUppserSets('Qset', response.data[0].Q);
                populateTheUppserSets('QmarkedSet', response.data[0].Qmarked);
                populateTheUppserSets('Rset', response.data[0].R);
                //populateTheUppserSets('Hset', response.data[0].H);
            }
            else
            {
                console.log("Done.");
            }
        })
        .catch(function (error) {   

            if(error.hasOwnProperty('response') && error.response.hasOwnProperty('status') && error.response.status == 425)
            {
                console.log(error.response.result);
                console.log("Lengthening time to " + ms * 2 + "ms.");
                setTimeout(() => getStatus(step, ms * 2), ms * 2);
                return;
            }

            clearTimeout(timeout);

            //When unsuccessful, print the error.
            console.log(error);
            let errorpanel = document.getElementById("errorpanel");
            let p = document.createElement("p");
            let text = document.createTextNode(error);
            p.append(text);
            p.classList.add("text-center");
            errorpanel.appendChild(p);
            errorpanel.removeAttribute("hidden")
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
        let children = Ei.childNodes;
        for(let k = children.length - 1; k > -1; k--)
        {
            if(children[k].nodeName == "P")
            {
                Ei.removeChild(children[k]);
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

function populateTheUppserSets(id, theArray)
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