let parseStatus = require('./parseStatusM');

reset = "\x1b[0m";
bright = "\x1b[1m";
dim = "\x1b[2m";
underscore = "\x1b[4m";
blink = "\x1b[5m";
reverse = "\x1b[7m";
hidden = "\x1b[8m";

fgBlack = "\x1b[30m";
fgRed = "\x1b[31m";
fgGreen = "\x1b[32m";
fgYellow = "\x1b[33m";
fgBlue = "\x1b[34m";
fgMagenta = "\x1b[35m";
fgCyan = "\x1b[36m";
fgWhite = "\x1b[37m";

bgBlack = "\x1b[40m";
bgRed = "\x1b[41m";
bgGreen = "\x1b[42m";
bgYellow = "\x1b[43m";
bgBlue = "\x1b[44m";
bgMagenta = "\x1b[45m";
bgCyan = "\x1b[46m";
bgWhite = "\x1b[47m";

function sleep(ms) {
    return new Promise(
        resolve => setTimeout(resolve, ms)
    );
}

async function continueIfAllowed(nextFunction)
{
    if(!parseStatus.parseStatus.canContinue())
    {
        console.log("Cannot continue. Sleeping for 1 sec.");
        await sleep(400);
        continueIfAllowed(nextFunction);
    }
    else
    {
        console.log("Can continue now. Calling next function.");
        setImmediate(nextFunction);
    }
}

function updateParseStatus(parseStatus, earleyScott, text = "")
{
    parseStatus.parseStatus.setE(earleyScott._E);
    parseStatus.parseStatus.setR(earleyScott._R);
    parseStatus.parseStatus.setV(earleyScott._V);
    parseStatus.parseStatus.setQ(earleyScott._Q);
    parseStatus.parseStatus.setH(earleyScott._H);
    parseStatus.parseStatus.setQmarked(earleyScott._Qmarked);
    parseStatus.parseStatus.setDescription(text);
}


class EarleyScott
{
    constructor(tokens, alphabet, grammar){
        this._tokens = tokens;
        this._alphabet = alphabet;
        this._grammar = [];
        this._terminalsAndNonTerminals = new Set();          // The set of all terminals and non-terminals, 
                                                            // NOT TO BE CONFUSED with ΣN, which is the set of 
                                                            // all strings of terminals and non-terminals that begin with an non-terminal.
        this._nonTerminals = new Set();  // The set of all non-terminals
        this._terminals = new Set();     // The set of all terminals

        // Convert the JSON grammar to our grammar form (an array of Production objects)
        grammar.forEach(jsonProduction => {
            // We allow Backus-Naur form from the client but transform them to separate productions.
            let fullRhs_BackusNaur = jsonProduction.slice(1);
            fullRhs_BackusNaur.forEach(rhs => {
                this._grammar.push(new Production(jsonProduction[0], rhs));
            });  
        });

        this._startProductions = this._grammar.filter(production => production.lhs == 'S')

        if(!this._startProductions.length)
        {
            throw new Error("There must be at least one start productions with left hand side non-terminal 'S' in the grammar.");
        }

        this._grammar.forEach(production => {
            this._nonTerminals.add(production.lhs);
            this._terminalsAndNonTerminals.add(production.lhs);

            production.rhs.forEach(rhs_component => {
                this._terminalsAndNonTerminals.add(rhs_component);
            });  
            this._terminalsAndNonTerminals.add("eps"); // In case epsilon is not in the grammar, add it now. Epsilon is denoted with the string "eps".  

        });

        this._terminals = this.difference(this._terminalsAndNonTerminals, this._nonTerminals);

        // Earley sets initialized, an array of arrays of EarleyScottItem-objects: E[0], E[1] ... E[N]
        this._E =  [];        
        this._tokens.forEach(token => { this._E.push([])}); // First we create N number of items
        this._E.push([]); // ... and then add one.

        this._R = [];        // Queue R initialized, will be an array of EarleyScottItem-objects
        this._Q = [];        // Queue Q initialized, will be an array of EarleyScottItem-objects
        this._Qmarked = [];  // Queue Q' initialized, will be an array of EarleyScottItem-objects
        this._V = [];        // Queue V initialized, will be an array of Nodes
        this._H = [];        // Queue H initialized, will be an array of H_items. Unlike original we initialize here so array will not be empty in parseStatus.
        
        parseStatus.parseStatus.resetParseStatus();
        console.log("EarleyScott constructor finished.");
    }

    parse(){

        this._startProductions.forEach(startProduction => {

            // Create an item that might be used in the next two if-statements.
            let esItem = new EarleyScottItem(new Production('S', '· ' + startProduction.rhs.join(" ")), 0, null);

            // According to Scott ΣN is the set of all strings of terminals and non-terminals that start with a non-terminal. 
            // Since this set can be infinite and is in the theoretical realm we simply check if the first token is a non-terminal.
            // production.cursorIsInFrontOfNonTerminal or cursorIsAtEnd() fulfills the criteria of delta being in ΣN.
            if(esItem.productionOrNT.cursorIsInFrontOfNonTerminal(this._nonTerminals) || esItem.productionOrNT.cursorIsAtEnd())
            {
                this._E[0].push(esItem);
                console.log("Have pushed and continued.");
            }

            if(esItem.productionOrNT.cursorIsInFrontOfTerminal(this._terminals) && this._tokens[0] == esItem.productionOrNT.terminalAfterCursor(this._terminals))
            {
                this._Qmarked.push(esItem);
            }
        });

        for(let i = 0; i <= this._tokens.length; i++){
            
            // Initialize the queues
            this._H = []; // Initialize this again here according to original code.
            this._R = this._E[i].map(x => this.cloneEarleyScottItem(x)); 
            this._Q = this._Qmarked.map(x => this.cloneEarleyScottItem(x)); 
            this._Qmarked = [];
            let v; // Initializing but is not used or given a value until later in the loop.

            while(this._R.length) // while R is not empty
            {
                let element = this._R.pop();
                if(element.productionOrNT.cursorIsInFrontOfNonTerminal(this._nonTerminals))
                {
                    let productionsStartingWithTheNonTerminal = this._grammar.filter(production => production.lhs == element.productionOrNT.nonTerminalAfterCursor(this._nonTerminals));
                    productionsStartingWithTheNonTerminal.forEach(production => {
                        let newProductionWithDotAtBeginning = new Production(production.lhs, "· " + production.rhs.join(" "));

                        let newEarleyScottItem = new EarleyScottItem(new Production(newProductionWithDotAtBeginning.lhs, newProductionWithDotAtBeginning.rhs.join(" ")), i, null);

                        // production.cursorIsInFrontOfNonTerminal or cursorIsAtEnd() fulfills the criteria of delta being in ΣN.
                        // Checking if delta starts with a non-terminal according to original by Scott.
                        if((newProductionWithDotAtBeginning.cursorIsInFrontOfNonTerminal(this._nonTerminals) || newProductionWithDotAtBeginning.cursorIsAtEnd())
                            && !this._E[i].some(item => item.productionOrNT.isEqual(newProductionWithDotAtBeginning)))
                        {
                            this._E[i].push(newEarleyScottItem);
                            this._R.push(this.cloneEarleyScottItem(newEarleyScottItem)); // Make sure to clone item.
                        }
                        // Note the difference from original paper here as the array is 0-based but the string is 1-based in paper.
                        if(this._tokens[i] == production.rhs[0] && !this._Q.some(item => item.isEqual(newEarleyScottItem))) 
                        {
                            this._Q.push(this.cloneEarleyScottItem(newEarleyScottItem)); // Make sure to clone item.
                        }

                    });
                    if(this._H.some(h_item => h_item.nonTerminal == element.productionOrNT.nonTerminalAfterCursor(this._nonTerminals)))
                    {
                        let h_items = this._H.filter(h_item => h_item.nonTerminal == element.productionOrNT.nonTerminalAfterCursor(this._nonTerminals));
                        element.moveCursorForwardByOne();
                        let y = this.make_node(element, element.i, i, element.w, h_items[0].node, this._V);
                        let newElement = new EarleyScottItem(new Production(element.productionOrNT.lhs, element.productionOrNT.rhs.join(" ")), element.i, y);
                        // production.cursorIsInFrontOfNonTerminal or cursorIsAtEnd() fulfills the criteria of delta being in ΣN.
                        if((element.productionOrNT.cursorIsInFrontOfNonTerminal(this._nonTerminals) || element.productionOrNT.cursorIsAtEnd())
                            && !this._E[i].some(earleyScrottItem => earleyScrottItem.isEqual(newElement)))
                        {
                            this._E[i].push(newElement);
                            this._R.push(newElement);
                        }
                        if(newElement.productionOrNT.betaAfterCursor[0] == this._tokens[i]) // Note our token array is 0-based unlike Scott's.
                        {
                            this._Q.push(newElement);
                        }
                    }
                }
                if(element.productionOrNT.cursorIsAtEnd())
                {
                    if(element.w == null)
                    {
                        let D_node = new Node(element.productionOrNT.lhs, i, i, this._terminals, this._nonTerminals);
                        
                        let arr = this._V.filter(item => item.isEqual(D_node));
                        if(arr.length === 0)
                        {
                            v = D_node;
                            this._V.push(v);
                        }
                        else
                        {
                            v = arr[0];
                        }
                        element.w = v;

                        let unaryFamilyWithEpsilonNode = new UnaryFamily(new Node("eps", null, null, this._terminals, this._nonTerminals));
                        if(!element.w.hasFamily(unaryFamilyWithEpsilonNode))
                        {
                            element.w.addFamilyOfChildren(unaryFamilyWithEpsilonNode);
                        }

                    }
                    if(element.i == i)
                    {
                        this._H.push(new H_Item(element.productionOrNT.lhs, element.w));
                    }
                    for(let j=0; j <= i; j++)
                    {
                        this._E[j].forEach(item => {
                            if(item.productionOrNT.cursorIsInFrontOfNonTerminal(this._nonTerminals) 
                                && item.productionOrNT.nonTerminalAfterCursor(this._nonTerminals) == element.productionOrNT.lhs)
                            {
                                // Need to copy the item first as otherwise calling moveCursorForwardByOne messes up the ESI in E_i which might need to be used later unchanged.
                                let newEarleyScottItem = new EarleyScottItem(
                                    new Production(item.productionOrNT.lhs, item.productionOrNT.rhs.join(" ")), 
                                    item.i, 
                                    item.w // w is an node reference so it does not need to be copied.
                                );
                                newEarleyScottItem.productionOrNT.moveCursorForwardByOne();
                                let y = this.make_node(newEarleyScottItem.productionOrNT, newEarleyScottItem.i, i, newEarleyScottItem.w, element.w, this._V);

                                let esi_with_node = new EarleyScottItem(new Production(newEarleyScottItem.productionOrNT.lhs, newEarleyScottItem.productionOrNT.rhs.join(" ")), newEarleyScottItem.i, y);
                                
                                // production.cursorIsInFrontOfNonTerminal or cursorIsAtEnd() fulfills the criteria of delta being in ΣN.
                                if((newEarleyScottItem.productionOrNT.cursorIsInFrontOfNonTerminal(this._nonTerminals) || newEarleyScottItem.productionOrNT.cursorIsAtEnd())
                                    && !this._E[i].some(innerItem => innerItem.productionOrNT.isEqual(newEarleyScottItem.productionOrNT) 
                                    && innerItem.i == newEarleyScottItem.i && innerItem.w == y))
                                {
                                    this._E[i].push(esi_with_node);
                                    this._R.push(esi_with_node);   
                                }
                                // Although we use the betaAfterCursor getter we are in fact checking the first character of the delta
                                // according to Scott's paper. 
                                if(newEarleyScottItem.productionOrNT.betaAfterCursor[0] == this._tokens[i]) // Note our token array is 0-based unlike Scott's
                                {
                                    this._Q.push(esi_with_node);
                                }
                            }
                        });
                    }
                }

            }

            this._V = [];
            v = new Node(this._tokens[i], i, i + 1, this._terminals, this._nonTerminals);
            
            while(this._Q.length)
            {
                let element = this._Q.pop();
                element.productionOrNT.moveCursorForwardByOne();
                let y = this.make_node(element.productionOrNT, element.i, i + 1, element.w, v, this._V);
                
                let newEarleyScottItem = new EarleyScottItem(new Production(element.productionOrNT.lhs, element.productionOrNT.rhs.join(" ")), element.i, y);
                // production.cursorIsInFrontOfNonTerminal or cursorIsAtEnd() fulfills the criteria of delta being in ΣN.
                if(newEarleyScottItem.productionOrNT.cursorIsInFrontOfNonTerminal(this._nonTerminals) || newEarleyScottItem.productionOrNT.cursorIsAtEnd())
                {
                    this._E[i + 1].push(newEarleyScottItem);
                }
                if(element.productionOrNT.betaAfterCursor[0] == this._tokens[i + 1]) // Note our token array is 0-based unlike Scott's
                {
                    this._Qmarked.push(newEarleyScottItem);
                }
            }
        }

        let arrayOfStartProductions = this._E[this._tokens.length].filter(item => item.productionOrNT.lhs == "S" 
            && item.productionOrNT.cursorIsAtEnd()
            && item.i === 0
            && item.w !== null);

        if(arrayOfStartProductions.length)
        {
            updateParseStatus(parseStatus, this, "Finished executing parse in one run.");
            return arrayOfStartProductions[0].w;
        }
        else
        {
            return "FAILURE";
        }
    }

    async parseAsync1(counter)
    {
        console.log(fgWhite + "%s" + reset, "Started parseAsync1 - start with waiting");
        if(!parseStatus.parseStatus.canContinue())
        {
            continueIfAllowed(() => this.parseAsync1(counter));
            return;
        }
        
        let startProduction = this._startProductions.shift();
        // Create an item that might be used in the next two if-statements.
        let esItem = new EarleyScottItem(new Production('S', '· ' + startProduction.rhs.join(" ")), 0, null);

        // According to Scott ΣN is the set of all strings of terminals and non-terminals that start with a non-terminal. 
        // Since this set can be infinite and is in the theoretical realm we simply check if the first token is a non-terminal.
        // production.cursorIsInFrontOfNonTerminal or cursorIsAtEnd() fulfills the criteria of epsilon being in ΣN.
        let whichBranch = [];
        if(esItem.productionOrNT.cursorIsInFrontOfNonTerminal(this._nonTerminals) || esItem.productionOrNT.cursorIsAtEnd())
        {
            this._E[0].push(esItem);
            whichBranch.push("E[0]");
        }

        if(esItem.productionOrNT.cursorIsInFrontOfTerminal(this._terminals) && this._tokens[0] == esItem.productionOrNT.terminalAfterCursor(this._terminals))
        {
            this._Qmarked.push(esItem);
            whichBranch.push("Qmarked");
        }
        console.log("Finishing parseAsync1 - updating and sleeping");
        updateParseStatus(parseStatus, this, "Iteration " + counter + " of for-loop for start productions. Added " + esItem.toString() + " to " 
            + whichBranch.join(" and ") + ".");
        parseStatus.parseStatus.incrementLastStepShown();
        counter++;
        if(this._startProductions.length == 0) continueIfAllowed(() => this.parseAsync2_mainForLoop(0)); // Start with i = 0
        else continueIfAllowed(() => this.parseAsync1(counter));
    }

    async parseAsync2_mainForLoop(i)
    {
        console.log(fgWhite + "%s" + reset, "Starting parseAsync2_mainForLoop. i = " + i);
        if(i > this._tokens.length)
        {
            console.log("For loop has ended. Going ot FinalSuccessCheck.");
            continueIfAllowed(() => this.parseAsync9_FinalSuccessCheck());
            return;
        }

        console.log("Starting initialization of more queues.");
        // Initialize the queues
        this._H = [];
        this._R = this._E[i].map(x => this.cloneEarleyScottItem(x)); 
        this._Q = this._Qmarked.map(x => this.cloneEarleyScottItem(x)); 
        this._Qmarked = [];
        
        if(this._R.length)
        {
            console.log("Going into while loop.");
            this.parseAsync3_whileLoop_if1(i);
        }
        else
        {
            console.log("Going into CreateNewNode");
            this.parseAsync8_CreateNewNode(i);
        }   
    }

    async parseAsync3_whileLoop_if1(i)
    {
        console.log(fgWhite + "%s" + reset, "Started parseAsync3_whileLoop_if1.");
        let element = this._R.shift();

        if(element.productionOrNT.cursorIsInFrontOfNonTerminal(this._nonTerminals))
        {
            let productionsStartingWithTheNonTerminal = this._grammar.filter(production => production.lhs == element.productionOrNT.nonTerminalAfterCursor(this._nonTerminals));
            if(productionsStartingWithTheNonTerminal.length)
            {
                this.parseAsync4_productionStartingWithTheNonTerminal(i, productionsStartingWithTheNonTerminal, element);
            }
        }
        else
        {
            this.parseAsync3_whileLoop_if2(i, element);
        }
    }

    async parseAsync3_whileLoop_if2(i, element)
    {
        console.log(fgWhite + "%s" + reset, "Started parseAsync3_whileLoop_if2.");
        if(element.productionOrNT.cursorIsAtEnd())
        {
            this.parseAsync6_CursorIsAtEnd_if1(i, element);
        }
        else
        {
            this.parseAsync3_whileLoop_if3(i);
        }
    }

    async parseAsync3_whileLoop_if3(i)
    {
        console.log(fgWhite + "%s" + reset, "Started parseAsync3_whileLoop_if3.");
        if(this._R.length)
        {
           this.parseAsync3_whileLoop_if1(i);
        }
        else
        {
            // Go staight to node creation at the bottom.
           this.parseAsync8_CreateNewNode(i);
        }
    }
    
    async parseAsync4_productionStartingWithTheNonTerminal(i, productionsStartingWithTheNonTerminal, originalElement)
    {
        console.log(fgWhite + "%s" + reset, "Started parseAsync4_productionStartingWithTheNonTerminal.");
        let production = productionsStartingWithTheNonTerminal.shift();
        let newProductionWithDotAtBeginning = new Production(production.lhs, "· " + production.rhs.join(" "));
        let newEarleyScottItem = new EarleyScottItem(new Production(newProductionWithDotAtBeginning.lhs, newProductionWithDotAtBeginning.rhs.join(" ")), i, null);
        
        // production.cursorIsInFrontOfNonTerminal or cursorIsAtEnd() fulfills the criteria of delta being in ΣN.
        // Checking if delta starts with a non-terminal according to original by Scott.
        let whichBranch = [];
        whichBranch.push("In if Λ=(B ::= α · Cβ,h,w), where C = " + production.lhs + ".");
        if((newProductionWithDotAtBeginning.cursorIsInFrontOfNonTerminal(this._nonTerminals) || newProductionWithDotAtBeginning.cursorIsAtEnd())
            && !this._E[i].some(item => item.productionOrNT.isEqual(newProductionWithDotAtBeginning)))
        {
            this._E[i].push(newEarleyScottItem);
            this._R.push(this.cloneEarleyScottItem(newEarleyScottItem)); // Make sure to clone item.
            whichBranch.push("E[" + i + "] and R, ");
        }
        // Note the difference from original paper here as the array is 0-based but the string is 1-based in paper.
        if(this._tokens[i] == production.rhs[0] && !this._Q.some(item => item.isEqual(newEarleyScottItem))) 
        {
            this._Q.push(this.cloneEarleyScottItem(newEarleyScottItem)); // Make sure to clone item.
            whichBranch.push("Q");
        }
        if(whichBranch.length > 1) whichBranch.splice(1, 0, "Added element " + newEarleyScottItem.toString() + " to");
        updateParseStatus(parseStatus, this, whichBranch.join(" "));
        parseStatus.parseStatus.incrementLastStepShown();
        if(productionsStartingWithTheNonTerminal.length)
        {
            continueIfAllowed(() => this.parseAsync4_productionStartingWithTheNonTerminal(i, productionsStartingWithTheNonTerminal, originalElement));
        } 
        else
        {
            continueIfAllowed(() => this.parseAsync3_whileLoop_if2(i, originalElement));
        }

    }

    async parseAsync5_check_H_queue(i, element)
    {
        console.log(fgWhite + "%s" + reset, "Started parseAsync5_check_H_queue.");
        if(this._H.some(h_item => h_item.nonTerminal == element.productionOrNT.nonTerminalAfterCursor(this._nonTerminals))) // Taking out v comparison, no need for that
        {
            let h_elements = this._H.filter(h_item => h_item.nonTerminal == element.productionOrNT.nonTerminalAfterCursor(this._nonTerminals));
            element.moveCursorForwardByOne();
            let y = this.make_node(element, element.i, i, element.w, h_elements[0].node, this._V);
            let newElement = new EarleyScottItem(new Production(element.productionOrNT.lhs, element.productionOrNT.rhs.join(" ")), element.i, y);
            // production.cursorIsInFrontOfNonTerminal or cursorIsAtEnd() fulfills the criteria of delta being in ΣN.
            let whichBranch = [];
            if((element.productionOrNT.cursorIsInFrontOfNonTerminal(this._nonTerminals) || element.productionOrNT.cursorIsAtEnd())
                && !this._E[i].some(earleyScrottItem => earleyScrottItem.isEqual(newElement)))
            {
                this._E[i].push(newElement);
                this._R.push(newElement);
                whichBranch.push("E[" + i + "] and R");
            }
            if(newElement.productionOrNT.betaAfterCursor[0] == this._tokens[i]) // Note our token array is 0-based unlike Scott's.
            {
                this._Q.push(newElement);
                whichBranch.push("Q");
            }
        }

        updateParseStatus(parseStatus, this, "In sub-branch if ((C, v) ∈ H). Added " + newElement.toString() + " to " + whichBranch.join(" and ") + ".");
        parseStatus.parseStatus.incrementLastStepShown();
        if(element.productionOrNT.cursorIsAtEnd())
        {
            continueIfAllowed(() => this.parseAsync6_CursorIsAtEnd_if1(i, originalElement));
        }
        else
        {
            continueIfAllowed(() => this.parseAsync3_whileLoop_if1(i));
        }
    }

    async parseAsync6_CursorIsAtEnd_if1(i, element)
    {
        console.log(fgWhite + "%s" + reset, "Started parseAsync6_CursorIsAtEnd_if1.");
        if(element.w == null)
        {
            let D_node = new Node(element.productionOrNT.lhs, i, i, this._terminals, this._nonTerminals);
            
            let v;
            let arr = this._V.filter(item => item.isEqual(D_node));
            let whichBranch = "";
            if(arr.length === 0)
            {
                v = D_node;
                this._V.push(v);
                whichBranch = "No node " + D_node.toString() + " found. Created it and added to queue V.";
            }
            else
            {
                v = arr[0];
                whichBranch = "Node " + D_node.toString() + " found."
            }
            element.w = v;
            updateParseStatus(parseStatus, this, "In if Λ=(D ::= α·,h,w), sub-branch if w = null. " + whichBranch + " w set to v.");
            parseStatus.parseStatus.incrementLastStepShown();
            continueIfAllowed(() => this.parseAsync6_CursorIsAtEnd_innerIf(i, element));
            
        }
        else
        {
            this.parseAsync6_CursorIsAtEnd_if2(i, element);
        }
        
    }

    async parseAsync6_CursorIsAtEnd_innerIf(i, element)
    {
        console.log(fgWhite + "%s" + reset, "Started parseAsync6_CursorIsAtEnd_innerIf.");
        let unaryFamilyWithEpsilonNode = new UnaryFamily(new Node("eps", null, null, this._terminals, this._nonTerminals));
        if(!element.w.hasFamily(unaryFamilyWithEpsilonNode))
        {
            element.w.addFamilyOfChildren(unaryFamilyWithEpsilonNode);

            updateParseStatus(parseStatus, this, "w did not have a family of epsilon. Epsilon added as a child.");
            parseStatus.parseStatus.incrementLastStepShown();
            continueIfAllowed(() => this.parseAsync6_CursorIsAtEnd_if2(i, element));
        }
        else
        {
            this.parseAsync6_CursorIsAtEnd_if2(i, element);
        }
    }

    async parseAsync6_CursorIsAtEnd_if2(i, element)
    {
        console.log(fgWhite + "%s" + reset, "Started parseAsync6_CursorIsAtEnd_if2.");
        if(element.i == i)
        {
            let h_item = new H_Item(element.productionOrNT.lhs, element.w);
            this._H.push(h_item);
            updateParseStatus(parseStatus, this, "h equals i, so we added " + h_item.toString() + " to queue H.");
            parseStatus.parseStatus.incrementLastStepShown();
            continueIfAllowed(() => this.parseAsync7_CursorIsAtEndForLoop(i, element, 0));
        }
        else
        {
            this.parseAsync7_CursorIsAtEndForLoop(i, element, 0);
        }
    }

    async parseAsync7_CursorIsAtEndForLoop(i, element, j)
    {
        console.log(fgWhite + "%s" + reset, "Started parseAsync7_CursorIsAtEndForLoop.");
        if(j <= i)
        {
            if(this._E[j].length)
            {
                let copyOfEj = [];
                this._E[j].forEach(item => {
                    let earleyScottItem = this.cloneEarleyScottItem(item);
                    copyOfEj.push(earleyScottItem); // Important to copy, otherwise I cannot use shift here below
                });
                let itemFromEj = copyOfEj.shift();
                this.parseAsync7_CursorIsAtEndForLoopItemsInE(i, element, j, copyOfEj, itemFromEj);
            }
            else
            {
                this.parseAsync7_CursorIsAtEndForLoop(i, element, j + 1);
            }
        }
        else
        {
            if(this._R.length) this.parseAsync3_whileLoop_if1(i);
            else this.parseAsync8_CreateNewNode(i);
        }
        
    }

    async parseAsync7_CursorIsAtEndForLoopItemsInE(i, element, j, queue, item)
    {
        console.log(fgWhite + "%s" + reset, "Started parseAsync7_CursorIsAtEndForLoopItemsInE.");
        let whichBranch = [];
        whichBranch.push("In for all (A ::= τ · Dδ,k,z) in Eh (E[" + j + "]). Looking at item " + item.toString() + " where D should equal " + element.productionOrNT.lhs);
        if(item.productionOrNT.cursorIsInFrontOfNonTerminal(this._nonTerminals) 
            && item.productionOrNT.nonTerminalAfterCursor(this._nonTerminals) == element.productionOrNT.lhs)
        {
            // Need to copy the item first as otherwise calling moveCursorForwardByOne messes up the ESI in E_i which might need to be used later unchanged.
            let newEarleyScottItem = new EarleyScottItem(
                new Production(item.productionOrNT.lhs, item.productionOrNT.rhs.join(" ")), 
                item.i, 
                item.w // w is an node reference so it does not need to be copied.
            );
            newEarleyScottItem.productionOrNT.moveCursorForwardByOne();
            let y = this.make_node(newEarleyScottItem.productionOrNT, newEarleyScottItem.i, i, newEarleyScottItem.w, element.w, this._V);

            let newNodeWith_y_asAChild = new EarleyScottItem(new Production(newEarleyScottItem.productionOrNT.lhs, newEarleyScottItem.productionOrNT.rhs.join(" ")), newEarleyScottItem.i, y);

            whichBranch.push("Item on correct format. Have called MAKE_NODE.");
            // production.cursorIsInFrontOfNonTerminal or cursorIsAtEnd() fulfills the criteria of delta being in ΣN.
            if((newEarleyScottItem.productionOrNT.cursorIsInFrontOfNonTerminal(this._nonTerminals) || newEarleyScottItem.productionOrNT.cursorIsAtEnd())
                && !this._E[i].some(innerItem => innerItem.productionOrNT.isEqual(newEarleyScottItem.productionOrNT) 
                && innerItem.i == newEarleyScottItem.i && innerItem.w == y))
            {
                this._E[i].push(newNodeWith_y_asAChild);
                this._R.push(newNodeWith_y_asAChild); 
                whichBranch.push("Criteria of former if clause met. Added " + newNodeWith_y_asAChild.toString() + " to queues E[" + i + "] and R.");
            }
            // Although we use the betaAfterCursor getter we are in fact checking the first character of the delta
            // according to Scott's paper. 
            if(newEarleyScottItem.productionOrNT.betaAfterCursor[0] == this._tokens[i]) // Note our token array is 0-based unlike Scott's
            {
                this._Q.push(newNodeWith_y_asAChild);
                whichBranch.push("Criteria of latter if clause met. Added " + newNodeWith_y_asAChild.toString() + " to queue Q.");
            }
        }
        else
        {
            whichBranch.push("Item on incorrect format.");
        }
        if(queue.length)
        {
            whichBranch.push("R is not empty. Repeating main while loop.");
            updateParseStatus(parseStatus, this, whichBranch.join(" "));
            parseStatus.parseStatus.incrementLastStepShown();
            let nextItem = queue.shift();
            continueIfAllowed(() => this.parseAsync7_CursorIsAtEndForLoopItemsInE(i, element, j, queue, nextItem));
        }
        else
        {
            whichBranch.push("R is now empty. Stopping breaking out of main while loop.");
            updateParseStatus(parseStatus, this, whichBranch.join(" "));
            parseStatus.parseStatus.incrementLastStepShown();
            continueIfAllowed(() => this.parseAsync7_CursorIsAtEndForLoop(i, element, j+1));
        }
    }

    async parseAsync8_CreateNewNode(i)
    {
        console.log(fgWhite + "%s" + reset, "Started parseAsync8_CreateNewNode.");
        this._V = [];
        let v = new Node(this._tokens[i], i, i + 1, this._terminals, this._nonTerminals);
        if(this._Q.length)
        {
            this.parseAsync8_WhileLoop(i, v)
        }
        else
        {
            this.parseAsync2_mainForLoop(i + 1);
        }
    }

    async parseAsync8_WhileLoop(i, v)
    {
        console.log(fgWhite + "%s" + reset, "Started parseAsync8_WhileLoop.");
        let whichBranch = [];
        let element = this._Q.pop();
        element.productionOrNT.moveCursorForwardByOne();
        let y = this.make_node(element.productionOrNT, element.i, i + 1, element.w, v, this._V);
        whichBranch.push("Popped element " + element.toString() + " from Q. Moved cursor forward and made a node.");
        let newEarleyScottItem = new EarleyScottItem(new Production(element.productionOrNT.lhs, element.productionOrNT.rhs.join(" ")), element.i, y);
        // production.cursorIsInFrontOfNonTerminal or cursorIsAtEnd() fulfills the criteria of delta being in ΣN.
        if(newEarleyScottItem.productionOrNT.cursorIsInFrontOfNonTerminal(this._nonTerminals) || newEarleyScottItem.productionOrNT.cursorIsAtEnd())
        {
            this._E[i + 1].push(newEarleyScottItem);
            whichBranch.push("Added the element to E[" + (i + 1) + "].");
        }
        if(element.productionOrNT.betaAfterCursor[0] == this._tokens[i + 1]) // Note our token array is 0-based unlike Scott's
        {
            this._Qmarked.push(newEarleyScottItem);
            whichBranch.push("Added the element to Q.");
        }

        updateParseStatus(parseStatus, this, whichBranch.join(" "));
        parseStatus.parseStatus.incrementLastStepShown();
        if(this._Q.length)
        {
            continueIfAllowed(() => this.parseAsync8_WhileLoop(i, v));
        }
        else
        {
            continueIfAllowed(() => this.parseAsync2_mainForLoop(i + 1));
        }
    }

    async parseAsync9_FinalSuccessCheck()
    {
        console.log("Ending - FinalSuccessCheck called.");
        let arrayOfStartProductions = this._E[this._tokens.length].filter(item => item.productionOrNT.lhs == "S" 
            && item.productionOrNT.cursorIsAtEnd()
            && item.i === 0
            && item.w !== null);

        //parseStatus.parseStatus.resetParseStatus();
        //parseStatus.parseStatus.setParsingDone();
        if(arrayOfStartProductions.length)
        {
            console.log(fgGreen + "%s" + reset, "PARSING SUCCESSFUL! (i.e. string was in language of grammar)");
            parseStatus.parseStatus.setFinal(arrayOfStartProductions);
            parseStatus.parseStatus.incrementLastStepShown();
            return arrayOfStartProductions[0].w;
        }
        else
        {
            console.log(fgRed + "%s" + reset, "PARSING FAILED! (i.e. string not in language of grammar)");
            parseStatus.parseStatus.setFinal("FAILURE");
            parseStatus.parseStatus.incrementLastStepShown();
            return "FAILURE";
        }
    }


    cloneEarleyScottItem(item)
    {
        if(item instanceof EarleyScottItem)
        {
            let production;
            let newESI;

            if(item.productionOrNT instanceof Production)
            {
                production = new Production(item.productionOrNT.lhs, item.productionOrNT.rhs.join(" "));
                newESI = new EarleyScottItem(production, item.i, item.w);
                return newESI;
            }
            else
            {
                newESI = new EarleyScottItem(item.productionOrNT, item.i, item.w);
                return newESI;
            }
        }
        else
        {
            throw new Error("This method only clones EarleyScottItem objects");
        }
    }

    make_node(production, j, i, w, v, V)
    {
        // Do some type checking before continuing.
        if(production instanceof Production && typeof(j) == "number" && typeof(i) == "number"
        && (w instanceof Node || w === null) && v instanceof Node && V instanceof Array)
        {
            // ... and then continue
            let s;
            if(production.betaAfterCursor[0] == "eps")
            {
                s = production.lhs;
            }
            else
            {
                s = production;
            }
            
            let y;
            if(production.alphaBeforeCursor[0] == "eps" && production.betaAfterCursor != "eps")
            {
                y = v;
            }
            else
            {
                let newNode = new Node(s, j, i, this._terminals, this._nonTerminals);
                y = V.find(node => node.isEqual(newNode));
                if(typeof y === "undefined")
                {
                    y = newNode;
                    V.push(y);
                }
    
                let unFam = new UnaryFamily(v);
                if(w === null && !y.hasFamily(v))
                {
                    y.addFamilyOfChildren(unFam);
                }
    
                let binFam = new BinaryFamily(w, v);
                if(w !== null && !y.hasFamily(binFam))
                {
                    y.addFamilyOfChildren(binFam);
                }
            }    
            return y;
        }
        else
        {
            throw new Error("At least one parameter of make_node() is of incorrect type.");
        }
    }

    difference(setA, setB) {
        let _difference = new Set(setA)
        for (let elem of setB) {
            _difference.delete(elem)
        }
        return _difference
    }
}

class EarleyScottItem
{
    constructor(productionOrNT, i, w)
    {
        this._productionOrNT = productionOrNT;
        this._i = i;

        if(w === null || w instanceof Node)
        {
            this._w = w;
        }
        else
        {
            throw new Error("Parameter w in EarleyScottItem must be an instance of Node or null.");
        }
    }

    get productionOrNT()
    {
        return this._productionOrNT;
    }

    get i()
    {
        return this._i;
    }

    get w()
    {
        return this._w;
    }

    set w(pointer)
    {
        if(pointer === null || pointer instanceof Node)
        {
            this._w = pointer;
        }
        else
        {
            throw new Error("Parameter w in EarleyScottItem must be an instance of Node or null.");
        }
    }

    isEqual(earleyScottItem)
    {
        if(!(earleyScottItem instanceof EarleyScottItem))
        {
            throw new Error("Parameter is not of type EarleyScottItem.");
        }

        if( this._i === earleyScottItem.i
            && this._w === earleyScottItem.w)
        {
            if(this._productionOrNT instanceof Production && this._productionOrNT.isEqual(earleyScottItem.productionOrNT))
            {
                return true;
            } 
            else if(!(this._productionOrNT instanceof Production) && this._productionOrNT == earleyScottItem.productionOrNT)
            {
                return true;
            }
        }
        
        return false;
    }

    toString()
    {
        if(this._productionOrNT instanceof Production)
        {
            return "(" + this.productionOrNT.lhs + " ::= " + this.productionOrNT.rhs.join("") + ", " + this.i + ", " + (this._w === null ? "null" : this._w.toString()) + ")";
        }
        else
        {
            return "(" + this.productionOrNT + ", " + this.i + ", " + (this._w === null ? "null" : this._w.toString()) + ")";
        }
    }
}

class Production
{
    constructor(lhs, rhs)
    {
        this._lhs = lhs;
        this._rhs = rhs;
    }

    get lhs()
    {
        return this._lhs;
    }

    get rhs()
    {
        return this._rhs.split(" ");
    }

    nonTerminalAfterCursor(nonTerminalsArrayReference)
    {
        if(this.cursorIsInFrontOfNonTerminal(nonTerminalsArrayReference))
        {
            let ix = this.rhs.indexOf("·");
            return this.rhs[ix + 1];
        }
        else
        {
            throw new Error("The cursor is not in front of a non-terminal");
        }
    }

    terminalAfterCursor(terminalsArrayReference)
    {
        if(this.cursorIsInFrontOfTerminal(terminalsArrayReference))
        {
            let ix = this.rhs.indexOf("·");
            return this.rhs[ix + 1];
        }
        else
        {
            throw new Error("The cursor is not in front of a terminal");
        }
    }

    get betaAfterCursor()
    {
        let ix = this.rhs.indexOf("·");
        if(ix < this.rhs.length - 1) return this.rhs.slice(ix + 1)
        else return ["eps"];
    }

    get alphaBeforeCursor()
    {
        let ix = this.rhs.indexOf("·");
        if(ix > 1) return this.rhs.slice(0, ix - 1) // [0, 1, 2, 3]
        else return ["eps"];
    }

    moveCursorForwardByOne()
    {
        let arr = this.rhs;
        let ix = arr.indexOf("·");
        let dot = arr[ix];
        let nextItem = arr[ix + 1];
        arr[ix] = nextItem;
        arr[ix + 1] = dot;
        this._rhs = arr.join(" ");
    }

    cursorIsInFrontOfNonTerminal(nonTerminalsArrayReference)
    {
        let rhs_components = this.rhs;
        let ix = rhs_components.indexOf("·");
        if(ix == rhs_components.length - 1) return false;
        return nonTerminalsArrayReference.has(rhs_components[ix + 1]);
    }

    cursorIsInFrontOfTerminal(terminalsArrayReference)
    {
        let rhs_components = this.rhs;
        let ix = rhs_components.indexOf("·");
        if(ix == rhs_components.length - 1) return false;
        return terminalsArrayReference.has(rhs_components[ix + 1]);
    }

    cursorIsAtBeginning()
    {
        let rhs_components = this.rhs;
        let ix = rhs_components.indexOf("·");
        if(ix === 0) return true;
        else return false;
    }

    cursorIsAtEnd()
    {
        let rhs_components = this.rhs;
        let ix = rhs_components.indexOf("·");
        if(ix === rhs_components.length - 1) return true;
        // Handle if cursor is in front of epsilon which is at the end.
        else if(rhs_components.indexOf("eps") == rhs_components.length - 1 && ix == rhs_components.length - 2) return true;
        else return false;
    }

    isEqual(production)
    {
        if(this._lhs === production.lhs && this._rhs === production.rhs.join(" ")) return true;
        else return false;
    }

    toString()
    {
        return "(" + this._lhs + " ::= " + this._rhs + ")";
    }
}

class Node
{
    constructor(productionOrNTorT, startIndex, endIndex, terminalsArrayReference, nonTerminalsArrayReference)
    {
        this._non_terminal_type = "non-terminal";
        this._terminal_type = "terminal";
        this._production_type = "production";
        
        if(productionOrNTorT === undefined)
        {
            productionOrNTorT = "eps";
        }

        if(productionOrNTorT instanceof Production)
        {
            this._production = productionOrNTorT;
            this._nonTerminal = null;
            this._terminal = null;
        }
        else if(nonTerminalsArrayReference.has(productionOrNTorT))
        {  
            this._production = null;
            this._nonTerminal = productionOrNTorT;
            this._terminal = null;
        }
        else if(terminalsArrayReference.has(productionOrNTorT))
        {
            this._production = null;
            this._nonTerminal = null;
            this._terminal = productionOrNTorT;
        }
        else
        {
            throw new Error("Parameter productionPrNTorT must be of type Production or be a legal terminal or non-terminal.");
        }

        if((typeof(startIndex) == "number" && typeof(endIndex) == "number") 
            || (startIndex === null && endIndex === null && this._terminal == "eps"))
        {
            this._startIndex = startIndex;
            this._endIndex = endIndex;
        }
        else
        {
            throw new Error("Parameters startIndex and endIndex must be a number or both must be null in case of epsilon node.");
        }

        this._familiesOfChildren = []; // Must only have objects of type UnaryFamily or BinaryFamily
    }

    get label_1()
    {
        if(this.typeofNode() == this._terminal_type) return this._terminal;
        else if(this.typeofNode() == this._non_terminal_type) return this._nonTerminal;
        else if(this.typeofNode() == this._production_type) return this._production;
        else throw new Error("Unexpected error.");
    }

    get startIndex()
    {
        return this._startIndex;
    }

    get endIndex()
    {
        return this._endIndex;
    }

    // Note that the "node types" here are not according to Scott's paper but to distinguish between label types, i.e. the first part of the label.
    typeofNode()
    {
        if(this._production === null && this._nonTerminal === null)
        {
            return this._terminal_type;
        }
        else if(this._production === null && this._terminal === null)
        {
            return this._non_terminal_type;
        }
        else if(this._terminal === null && this._nonTerminal === null)
        {
            return this._production_type;
        }
        else
        {
            throw new Error("Unexpected error.");
        }
    }

    addFamilyOfChildren(family)
    {
        if(this.typeofNode() == this._terminal_type)
        {
            throw Error("Terminal nodes cannot have families attached to them.");
        }
        if(family instanceof UnaryFamily || family instanceof BinaryFamily)
        {
            this._familiesOfChildren.push(family);
        }
        else throw new Error("A family of chilren of Node must be of type UnaryFamily of BinaryFamily");
    }

    hasFamily(family)
    {
        this._familiesOfChildren.forEach(fam => {
            if(family instanceof BinaryFamily 
                && fam instanceof BinaryFamily
                && fam.node.isEqual(family.node)
                && fam.node2.isEqual(family.node2))
            {
                return true;
            }
            else if(family instanceof UnaryFamily
                && fam instanceof UnaryFamily
                && fam.node.isEqual(family.node))
            {
                return true;   
            }
        });
        return false;
    }
    
    isEqual(node)
    {
        if(this.typeofNode() != node.typeofNode())
        {
            return false;
        }
        if(this.startIndex != node.startIndex || this.endIndex != node.endIndex)
        {
            return false;
        }
        if(this.typeofNode() == this._production_type)
        {
            return this._production.isEqual(node.label_1);

        }
        else if(this.typeofNode() == this._non_terminal_type)
        {
            return this._nonTerminal == node.label_1;

        }
        else if(this.typeofNode() == this._terminal_type)
        {
            return this._terminal == node.label_1;
        }
        else
        {
            throw new Error("Unexpected error");
        }
    }

    toString()
    {
        return "(" + this.label_1 + ", " + this._startIndex + ", " + this._endIndex + ")";
    }

    nodeWithFamiliesToString()
    {
        let firstPart = "(" + String(this.label_1) + ", " + this._startIndex + ", " + this._endIndex;
        if(this._familiesOfChildren.length)
        {
            let familiesToReturn = [];
            this._familiesOfChildren.forEach(family => {
                if(family instanceof BinaryFamily || family instanceof UnaryFamily)
                {
                    familiesToReturn.push(family.toString())
                }
                else
                {
                    throw new Error("The node " + this.toString() + " has a family of incorrect type. Only unary or binary allowed.");
                }
            });
            return firstPart + ", " + JSON.stringify(familiesToReturn) + ")";
        }
        else
        {
            return firstPart + ")";
        }
    }

    nodeWithFamiliesToArray()
    {
        let mainArray = [];
        mainArray.push(String(this.label_1));
        mainArray.push(this._startIndex);
        mainArray.push(this._endIndex);

        let innerArray = [];
        this._familiesOfChildren.forEach(family => {
            let outerFamilyArray = [];
            let familyArray1 = [];
            if(family instanceof BinaryFamily) // Must start with this otherwise instance of UnaryFamily will also return true for BinaryFamily as it inherits from UnaryFamily
            {
                familyArray1.push(String(family.node.label_1));
                familyArray1.push(family.node.startIndex);
                familyArray1.push(family.node.endIndex);
                outerFamilyArray.push(familyArray1);

                let familyArray2 = [];
                familyArray2.push(String(family.node2.label_1));
                familyArray2.push(family.node2.startIndex);
                familyArray2.push(family.node2.endIndex);
                outerFamilyArray.push(familyArray2);
                innerArray.push(outerFamilyArray);
            }
            else if(family instanceof UnaryFamily)
            {
                familyArray1.push(String(family.node.label_1));
                familyArray1.push(family.node.startIndex);
                familyArray1.push(family.node.endIndex);
                outerFamilyArray.push(familyArray1);
                innerArray.push(outerFamilyArray);
            }
            else
            {
                throw new Error("Family was of neither type UnaryFamily nor BinaryFamily. This should not happen.");
            }
        });
        if(innerArray.length)
        {
            mainArray.push(innerArray);
        }
        return mainArray;
    }
}

class UnaryFamily
{
    constructor(node)
    {
        this._node = node;
    }

    get node()
    {
        return this._node;
    }

    toString()
    {
        return "(" + this.node.toString() + ")";
    }
}

class BinaryFamily extends UnaryFamily
{
    constructor(node1, node2)
    {
        super(node1);
        this._node2 = node2;
    }

    get node2()
    {
        return this._node2;
    }

    toString()
    {
        return "(" + this.node.toString() + ", " + this.node2.toString() + ")";
    }
}

class H_Item
{
    constructor(nonTerminal, node)
    {
        this._nonTerminal = nonTerminal;
        this._node = node;
    }

    get nonTerminal()
    {
        return this._nonTerminal;
    }

    get node()
    {
        return this._node;
    }

    toString()
    {
        return "(" + this._nonTerminal + "," + this._node.toString() + ")";
    }
}

module.exports.EarleyScott = EarleyScott;