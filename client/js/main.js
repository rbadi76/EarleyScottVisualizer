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

function sendParseRequest()
{
    const alphabetStr = document.getElementById("alphabet").value;
    const tokenStr = document.getElementById("tokens").value;
    const grammarText = document.getElementById("grammar").value;
    const areWords = document.getElementById("areWords").checked;

    reqObj = new RequestObject(alphabetStr, tokenStr, grammarText, areWords);

    console.log(JSON.stringify(reqObj));
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

class RequestObject
{
    constructor(alphabet, tokenStr, grammarText, areWords)
    {
        this.alphabet = alphabet.split(" ");

        if(areWords)
        {
            this.tokenString = tokenStr.split(" ");
            this.grammar = grammarText.split(" ");
        }
        else
        {
            this.tokenString = tokenStr.split("");
            this.grammar = grammarText.split("");
        }

    }
}