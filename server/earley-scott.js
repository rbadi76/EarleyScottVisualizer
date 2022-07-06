class EarleyScott
{
    constructor(tokens, alphabet, grammar){
        this.tokens = tokens;
        this.alphabet = alphabet;
        this.grammar = [];
        this.sigmaN = new Set();        // The set of all terminals and non-terminals
        this.nonTerminals = new Set();  // The set of all non-terminals
        this.terminals = new Set();     // The set of all terminals

        // Convert the JSON grammar to our grammar form (an array of Production objects)
        grammar.forEach(jsonProduction => {
            // We allow Backus-Naur form from the client but transform them to separate productions.
            let fullRhs_BackusNaur = jsonProduction.slice(1, jsonProduction.length);
            fullRhs_BackusNaur.forEach(rhs => {
                this.grammar.push(new Production(jsonProduction[0], rhs));
            });  
        });

        this.startProductions = this.grammar.filter(production => production.getLhs() == 'S')

        this.grammar.forEach(production => {
            this.nonTerminals.add(production.getLhs());
            this.sigmaN.add(production.getLhs());

            let rhs_components = production.getRhs().split(" ");
            rhs_components.forEach(rhs_component => {
                this.sigmaN.add(rhs_component);
            });    

        });

        this.terminals = this.difference(this.sigmaN, this.nonTerminals);

        this.E = [];        // Earley sets initialized, an array of arrays of EarleyScottItem-objects: E[0], E[1] ... E[N]
        this.R = [];        // Queue R initialized
        this.Qmarked = [];  // Queue Q' initialized
        this.V = [];        // Queue V initialized       
    }

    parse(){

        this.startProductions.forEach(startProduction => {

            let rhs_0 = startProduction.rhs.split(" ")[0];

            // Create an item that might be used in the next two if-statements.
            let esItem = new EarleyScottItem(['S', '· ' + startProduction.rhs], 0, null);

            // According to Scott ΣN is the set of all terminals and non-terminals. Since this set can be infinite and is in the theoretical realm
            // we simply check if the first token is a non-terminal
            if(this.nonTerminals.has(rhs_0))
            {
                if(this.E.length == 0)
                {

                    this.E.push([esItem]);
                }
                else
                {
                    this.E[0].push(esItem);
                }
            }

            if(this.tokens[0] == rhs_0)
            {
                this.Qmarked.push(esItem);
            }
        });
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
        this.production = production;
        this.i = i;
        this.w = w;
    }

    getProduction()
    {
        return this.production;
    }

    get_i()
    {
        return this.i;
    }

    get_w()
    {
        return this.w;
    }
}

class Production
{
    constructor(lhs, rhs)
    {
        this.lhs = lhs;
        this.rhs = rhs;
    }

    getLhs()
    {
        return this.lhs;
    }

    getRhs()
    {
        return this.rhs;
    }
}

module.exports.EarleyScott = EarleyScott;