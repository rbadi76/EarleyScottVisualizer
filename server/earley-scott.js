let parseStatus = require('./parseStatusM');

function sleep(ms) {
    return new Promise(
        resolve => setTimeout(resolve, ms)
    );
}

async function continueWhenAllowed(parseStatus, earleyScott)
{
    while(!parseStatus.parseStatus.canContinue())
    {
        console.log("Cannot continue. Sleeping for 1 sec.");
        await sleep(1000);
    }
    console.log("Can continue now. Updating parseStatus.");
    parseStatus.parseStatus.setE = earleyScott._E;
    parseStatus.parseStatus.setR = earleyScott._R;
    parseStatus.parseStatus.setV = earleyScott._V;
    parseStatus.parseStatus.setQ = earleyScott._Q;
    parseStatus.parseStatus.setQmarked = earleyScott._Qmarked;

    // put into send
    parseStatus.parseStatus.incrementLastStepShown();
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

        this._R = [];        // Queue R initialized, will be and array of EarleyScottItem-objects
        this._Qmarked = [];  // Queue Q' initialized, will be and array of EarleyScottItem-objects
        this._V = [];        // Queue V initialized, will be and array of Nodes     
        
        parseStatus.parseStatus.resetParseStatus();
        parseStatus.parseStatus.setTotalSteps(15); // TODO: Set correct number later
        continueWhenAllowed(parseStatus, this);
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
                continueWhenAllowed(parseStatus, this);
            }

            if(esItem.productionOrNT.cursorIsInFrontOfTerminal(this._terminals) && this._tokens[0] == esItem.productionOrNT.terminalAfterCursor(this._terminals))
            {
                this._Qmarked.push(esItem);
                continueWhenAllowed(parseStatus, this);
            }
        });

        for(let i = 0; i <= this._tokens.length; i++){
            
            // Initialize the queues
            this._H = [];
            this._R = this._E[i].map(x => this.cloneEarleyScottItem(x)); // CLONE HAS BEEN IMPLEMENTED BUT NOT TESTED
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
                            continueWhenAllowed(parseStatus, this);
                        }
                        // Note the difference from original paper here as the array is 0-based but the string is 1-based in paper.
                        if(this._tokens[i] == production.rhs[0] && !this._Q.some(item => item.isEqual(newEarleyScottItem))) 
                        {
                            this._Q.push(this.cloneEarleyScottItem(newEarleyScottItem)); // Make sure to clone item.
                            continueWhenAllowed(parseStatus, this);
                        }

                    });
                    if(this._H.some(h_item => h_item.nonTerminal == element.productionOrNT.nonTerminalAfterCursor(this._nonTerminals) && 
                        h_item.node.isEqual(v)))
                    {
                        element.moveCursorForwardByOne();
                        let y = this.make_node(element, element.i, i, element.w, v, V);
                        let newElement = new EarleyScottItem(new Production(element.productionOrNT.lhs, element.productionOrNT.rhs.join(" ")), element.i, y);
                        // production.cursorIsInFrontOfNonTerminal or cursorIsAtEnd() fulfills the criteria of delta being in ΣN.
                        if((element.productionOrNT.cursorIsInFrontOfNonTerminal(this._nonTerminals) || element.productionOrNT.cursorIsAtEnd())
                            && !this._E[i].some(earleyScrottItem => earleyScrottItem.isEqual(newElement)))
                        {
                            this._E[i].push(newElement);
                            this._R.push(newElement);
                            continueWhenAllowed(parseStatus, this);
                        }
                        if(newElement.productionOrNT.betaAfterCursor[0] == this._tokens[i]) // Note our token array is 0-based unlike Scott's.
                        {
                            this._Q.push(newElement);
                            continueWhenAllowed(parseStatus, this);
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
                            continueWhenAllowed(parseStatus, this);
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
                            continueWhenAllowed(parseStatus, this);
                        }

                    }
                    if(element.i == i)
                    {
                        this._H.push(new H_Item(element.productionOrNT.lhs, element.w));
                        continueWhenAllowed(parseStatus, this);
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

                                let newNodeWith_y_asAChild = new EarleyScottItem(new Production(newEarleyScottItem.productionOrNT.lhs, newEarleyScottItem.productionOrNT.rhs.join(" ")), newEarleyScottItem.i, y);
                                
                                // production.cursorIsInFrontOfNonTerminal or cursorIsAtEnd() fulfills the criteria of delta being in ΣN.
                                if((newEarleyScottItem.productionOrNT.cursorIsInFrontOfNonTerminal(this._nonTerminals) || newEarleyScottItem.productionOrNT.cursorIsAtEnd())
                                    && !this._E[i].some(innerItem => innerItem.productionOrNT.isEqual(newEarleyScottItem.productionOrNT) 
                                    && innerItem.i == newEarleyScottItem.i && innerItem.w == y))
                                {
                                    this._E[i].push(newNodeWith_y_asAChild);
                                    this._R.push(newNodeWith_y_asAChild);   
                                    continueWhenAllowed(parseStatus, this);
                                }
                                // Although we use the betaAfterCursor getter we are in fact checking the first character of the delta
                                // according to Scott's paper. 
                                if(newEarleyScottItem.productionOrNT.betaAfterCursor[0] == this._tokens[i]) // Note our token array is 0-based unlike Scott's
                                {
                                    this._Q.push(newNodeWith_y_asAChild);
                                    continueWhenAllowed(parseStatus, this);
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
                    continueWhenAllowed(parseStatus, this);
                }
                if(element.productionOrNT.betaAfterCursor[0] == this._tokens[i + 1]) // Note our token array is 0-based unlike Scott's
                {
                    this._Qmarked.push(newEarleyScottItem);
                    continueWhenAllowed(parseStatus, this);
                }
            }
        }

        let arrayOfStartProductions = this._E[this._tokens.length].filter(item => item.productionOrNT.lhs == "S" 
            && item.productionOrNT.cursorIsAtEnd()
            && item.i === 0
            && item.w !== null);

        if(arrayOfStartProductions.length)
        {
            return arrayOfStartProductions[0].w;
        }
        else
        {
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
}

class H_Item
{
    constructor(nonTerminal, node)
    {
        this._nonTerminal;
        this._node;
    }

    get nonTerminal()
    {
        return this._nonTerminal;
    }

    get node()
    {
        return this._node;
    }
}

module.exports.EarleyScott = EarleyScott;