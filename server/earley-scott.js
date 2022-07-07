class EarleyScott
{
    constructor(tokens, alphabet, grammar){
        this._tokens = tokens;
        this._alphabet = alphabet;
        this._grammar = [];
        this._terminalsAndNonTerminals = new Set();          // The set of all terminals and non-terminals, 
                                                            // NOT TO BE CONFUSED with ΣN, which is the set of 
                                                            // all strings of terminals and non-terminals.
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

        this._grammar.forEach(production => {
            this.nonTerminals.add(production.lhs);
            this.terminalsAndNonTerminals.add(production.lhs);

            let rhs_components = production.rhs.split(" ");
            rhs_components.forEach(rhs_component => {
                this._terminalsAndNonTerminals.add(rhs_component);
            });  
            this._terminalsAndNonTerminals.add("eps"); // In case epsilon is not in the grammar, add it now. Epsilon is denoted with the string "eps".  

        });

        this._terminals = this.difference(this._terminalsAndNonTerminals, this._nonTerminals);

        this._E = [];        // Earley sets initialized, an array of arrays of EarleyScottItem-objects: E[0], E[1] ... E[N]
        this._R = [];        // Queue R initialized, will be and array of EarleyScottItem-objects
        this._Qmarked = [];  // Queue Q' initialized, will be and array of EarleyScottItem-objects
        this._V = [];        // Queue V initialized, will be and array of Nodes       
    }

    parse(){

        this._startProductions.forEach(startProduction => {

            let rhs_0 = startProduction.rhs.split(" ")[0];

            // Create an item that might be used in the next two if-statements.
            let esItem = new EarleyScottItem(['S', '· ' + startProduction.rhs], 0, null);

            // According to Scott ΣN is the set of all strings of terminals and non-terminals. Since this set can be infinite and is in the theoretical realm
            // we simply check if the first token is a non-terminal
            if(this._nonTerminals.has(rhs_0))
            {
                if(this._E.length === 0)
                {

                    this._E.push([esItem]);
                }
                else
                {
                    this._E[0].push(esItem);
                }
            }

            if(this._tokens[0] == rhs_0)
            {
                this._Qmarked.push(esItem);
            }
        });

        for(let i = 0; i <= this._tokens.length; i++){
            
            // Initialize the queues
            this._H = [];
            this._R = this._E[i].map(x => this.cloneEarleyScottItem(x)); // CLONE HAS BEEN IMPLEMENTED BUT NOT TESTED
            this._Q = this._Qmarked.map(x => this.cloneEarleyScottItem(x)); 
            this._Qmarked = [];
            let v; // Initializing but is not used or given a value until later in the loop.

            while(!this._R.length) // while R is not empty
            {
                let element = this._R.pop();
                if(element.productionOrNT.cursorIsInFrontOfNonTerminal)
                {
                    let productionsStartingWithTheNonTerminal = this._grammar.filter(production => production.lhs == element.nonTerminalInFrontOfCursor);
                    productionsStartingWithTheNonTerminal.forEach(production => {
                        newProductionWithDotAtBeginning = new Production(production.lhs, "· " + production.rhs.join(" "));
                        if(!this._E[i].has(newProductionWithDotAtBeginning))
                        {
                            this._E[i].push(newProductionWithDotAtBeginning);
                            this._R.push(newProductionWithDotAtBeginning);
                        }
                        if(this._tokens[i + 1] == production.lhs[0])
                        {
                            this._Q.push(newProductionWithDotAtBeginning);
                        }

                    });
                    if(this._H.find(h_item => h_item.nonTerminal == element.productionOrNT.nonTerminalAfterCursor,
                        h_item.node.isEqual(v)))
                    {
                        element.moveCursorForwardByOne();
                        let y = this.make_node(element, element.i, i, element.w, v, V);
                        let newElement = new EarleyScottItem(element.productionOrNT, element.i, y);
                        if(this._E[i].find(earleyScrottItem => earleyScrottItem.isEqual(newElement)).length)
                        {
                            this._E[i].push(newElement);
                            this._R.push(newElement);
                        }
                        if(newElement.productionOrNT.betaAfterCursor[0] == this._tokens[i + 1])
                        {
                            this._Q.push(newElement);
                        }
                    }
                }
                if(element.productionOrNT.cursorIsAtEnd)
                {
                    if(element.w == null)
                    {
                        let D_earleyScottItem = new EarleyScottItem(new Production(element.lhs, element.rhs), i, i);
                        let arr = this._V.find(item => item.isEqual(D_earleyScottItem));
                        if(arr.length === 0)
                        {
                            v = arr[0];
                            this._V.push(v);
                        }
                        else
                        {
                            v = arr[0];
                        }
                        element.w = v;

                        let unaryFamilyWithEpsilonNode = new UnaryFamily(new Node(new EarleyScottItem("eps", null, null)));
                        if(!element.w.hasFamily(unaryFamilyWithEpsilonNode))
                        {
                            w.addFamilyOfChildren(unaryFamilyWithEpsilonNode);
                        }

                    }
                    if(element.i = i)
                    {
                        this._H.push(new H_Item(element.productionOrNT.lhs), element.w);
                    }
                    for(let j=0; j <= i; j++)
                    {
                        this._E[j].forEach(item => {
                            if(item.productionOrNT.nonTerminalAfterCursor == element.productionOrNT.lhs)
                            {
                                item.productionOrNT.moveCursorForwardByOne;
                                let y = this.make_node(item, item.i, i, item.w, w, this._V);
                                if(this._E[i].find(innerItem => innerItem.productionOrNT.isEqual(item.productionOrNT) 
                                    && innerItem.i == item.i && innerItem.w == item.w))
                                {
                                    this._E[i].push(item);
                                    this._R.push(item);   
                                }
                                if(item.productionOrNT.betaAfterCursor[0] == this._tokens[i +1])
                                {
                                    this._Q.push(item);
                                }
                            }
                        });
                    }
                }

            }

            this._V = [];
            v = new Node(new EarleyScottItem(this._tokens[i + 1], i, i + 1));
            
            while(!this.Q.length)
            {
                let element = this._Q.pop();
                element.productionOrNT.moveCursorForwardByOne();
                let y = this.make_node(element.productionOrNT, element.i, i + 1, element.w, v, this._V);
                // According to Scott there is an if statment here to check if beta is in Sigma N. That
                // is unnecessary here.
                let newEarleyScottItem = new EarleyScottItem(new Production(element.productionOrNT.lhs, element.productionOrNT.rhs), element.i, y);
                this._E[i + 1].push(newEarleyScottItem);
                if(element.productionOrNT.betaAfterCursor[0] == this._tokens[i + 2])
                {
                    this._Qmarked.push(newEarleyScottItem);
                }
            }
        }

        let arrayOfStartProductions = this._E[this._tokens.length].find(item => item.productionOrNT.lhs == "S" && item.productionOrNT.cursorIsAtEnd
            && item.i === 0, item.w.isEqual(w));
        if(arrayOfStartProductions.length)
        {
            return w;
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
                production = new Production(item.productionOrNT.lhs, item.production.rhs);
                newESI = new EarleyScottItem(production, item.i, item.w);
                return newESI;
            }
            else
            {
                newESI = new EarleyScottItem(item.production, item.i, item.w);
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
        && typeof(w) == "number" && v instanceof Node && V instanceof Array)
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
            if(production.alphaBeforeCursor[0] == "eps" && production.getBetaAfterCursor != "eps")
            {
                y = v;
            }
            else
            {
                let newESI = new EarleyScottItem(s, j, i);
                let y = V.find(node => node.earleyScottItem.isEqual(newESI));
                if(y.length === 0)
                {
                    y = new Node(newESI);
                    V.push(y);
                }
    
                let unFam = new UnaryFamily(v);
                if(w === null && !y.familiesOfChildren.hasFamily(v))
                {
                    y.addFamilyOfChildren(unFam);
                }
    
                let binFam = new BinaryFamily(w, v);
                if(w !== null && !y.familiesOfChildren.hasFamily(binFam))
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

    isEqual(earleyScottItem)
    {
        if( this._i === earleyScottItem.i
            && this._w === earleyScottItem.w)
        {
            if(this._productionOrNT instanceof Production && this._productionOrNT.isEqual(earleyScottItem.production))
            {
                return true;
            } 
            else if(!(this._productionOrNT instanceof Production) && this._productionOrNT == earleyScottItem.lhs)
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

    get nonTerminalAfterCursor()
    {
        if(this.cursorIsInFrontOfNonTerminal())
        {
            let ix = this.rhs.indexOf("·");
            return this.rhs[ix + 1];
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

    cursorIsInFrontOfNonTerminal()
    {
        let rhs_components = this.rhs;
        let ix = rhs_components.indexOf("·");
        if(ix == rhs_components.length - 1) return false;
        return this._nonTerminals.has(rhs_components[ix + 1]);
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
        if(is === rhs_components.length -1) return true;
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
    constructor(earleyScottItem)
    {
        this._earleyScottItem = earleyScottItem;
        this._familiesOfChildren = []; // Must only have objects of type UnaryFamily or BinaryFamily
    }

    addFamilyOfChildren(family)
    {
        if(family instanceof UnaryFamily || family instanceof BinaryFamily)
        {
            this._familiesOfChildren.push(family);
        }
        else throw new Error("A family of chilren of Node must be of type UnaryFamily of BinaryFamily");
    }

    get earleyScottItem()
    {
        return this._earleyScottItem;
    }

    hasFamily(family)
    {
        this._familiesOfChildren.forEach(fam => {
            if(family instanceof BinaryFamily 
                && fam instanceof BinaryFamily
                && fam.node.earleyScottItem.isEqual(family.node.earleyScottItem)
                && fam.node2.earleyScottItem.isEqual(family.node2.earleyScottItem))
            {
                return true;
            }
            else if(family instanceof UnaryFamily
                && fam instanceof UnaryFamily
                && fam.node.earleyScottItem.isEqual(family.node.earleyScottItem))
            {
                return true;   
            }
        });
        return false;
    }
    
    isEqual()
    {
        if(this._earleyScottItem.isEqual()) return true;
        else return false;
    }
}

class UnaryFamily
{
    constructor(node)
    {
        this._node;
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