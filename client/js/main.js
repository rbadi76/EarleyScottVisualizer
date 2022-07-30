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
        //console.log(JSON.stringify(reqObj));
    }

}

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
            //When successful, print 'Success: ' and the received data
            if(response.data[0].result == 'OK')
            {
                alert("OK");
            }
        })
        .catch(function (error) {
            //When unsuccessful, print the error.
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
        if(tokens[i].length > 1) 
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
}