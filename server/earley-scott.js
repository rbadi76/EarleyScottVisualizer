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

            let rhs_components = production.getRhs().split(" ");
            rhs_components.forEach(rhs_component => {
                this._terminalsAndNonTerminals.add(rhs_component);
            });  
            this._terminalsAndNonTerminals.add("eps"); // In case epsilon is not in the grammar, add it now. Epsilon is denoted with the string "eps".  

        });

        this._terminals = this.difference(this._terminalsAndNonTerminals, this._nonTerminals);

        this._E = [];        // Earley sets initialized, an array of arrays of EarleyScottItem-objects: E[0], E[1] ... E[N]
        this._R = [];        // Queue R initialized
        this._Qmarked = [];  // Queue Q' initialized
        this._V = [];        // Queue V initialized       
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
            this._R = this._E[i].map((x) => x); // Make sure to copy by value, not reference.
            this._Q = this._Qmarked.map((x) => x); 
            this._Qmarked = [];

            while(!this._R.length) // while R is not empty
            {
                let element = this._R.pop();
                if(element.cursorIsInFrontOfNonTerminal)
                {
                    let productionsStartingWithTheNonTerminal = this._grammar.filter(production => production.lhs == element.getNonTerminalInFrontOfCursor());
                    productionsStartingWithTheNonTerminal.forEach(production => {
                        newProductionWithDotAtBeginning = new Production(production.lhs, "· " + production.getRhs().join(" "));
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
                    if(this._H.has("ADD ELEMENT OF THE CORRECT FORM LATER")) // We need a class or array of two elements with element.getNonTerminalInFrontOfCursor() on the left side.
                    {

                    }
                }

            }
        }
    }

    make_node(production, j, i, w, v, V)
    {
        if(production.getBetaAfterCursor()[0] == "eps")
        {
            let s = production.lhs;
        }
        else
        {
            let s = production;
        }
        
        if(production.getAlphaBeforeCursor()[0] == "eps" && production.getBetaAfterCursor != "eps")
        {
            let y = v;
        }
        else
        {
            let y = V.find(obj => obj.production == s, obj.i == j, obj.w == i);
            if(y.length === 0)
            {
                y = new Node(new EarleyScottItem(s, j, i));
                V.push(y);
            }

            if(w === null && y.familiesOfChildren.length === 0)
            {
                y.addFamilyOfChildren(v);
            }

            if(w !== null && )
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
    constructor(production, i, w)
    {
        this._production = production;
        this._i = i;
        this._w = w;
    }

    get production()
    {
        return this._production;
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
        if(this._production.isEqual(earleyScottItem.production) 
            && this._i === earleyScottItem.i
            && this._w === earleyScottItem.w)
        {
            return true;
        }
        else return false;
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
            let ix = this.getRhs().indexOf("·");
            return this.getRhs()[ix + 1];
        }
    }

    get betaAfterCursor()
    {
        let ix = this.getRhs().indexOf("·");
        return this.getRhs().slice(ix + 1);
    }

    get alphaBeforeCursor()
    {
        let ix = this.getRhs().indexOf("·");
        if(ix > 1) return this.getRhs().slice(0, ix - 1)
        else return ["eps"];
    }

    cursorIsInFrontOfNonTerminal()
    {
        let rhs_components = this.getRhs();
        let ix = rhs_components.indexOf("·");
        if(ix == rhs_components.length - 1) return false;
        return this._nonTerminals.has(rhs_components[ix + 1]);
    }

    cursorIsAtBeginning()
    {
        let rhs_components = this.getRhs();
        let ix = rhs_components.indexOf("·");
        if(ix === 0) return true;
        else return false;
    }

    cursorIsAtEnd()
    {
        let rhs_components = this.getRhs();
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
        this._familiesOfChildren = [];
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
                && fam.node.earleyScottItem.isEqual(family.node.earleyScottItem))
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

module.exports.EarleyScott = EarleyScott;