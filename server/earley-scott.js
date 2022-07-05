class EarleyScott{
    constructor(tokens, alphabet, grammar){
        this.tokens = tokens;
        this.alphabet = alphabet;
        this.grammar = grammar;
        this.sigmaN = new Set();        // The set of all terminals and non-terminals
        this.nonTerminals = new Set();  // The set of all non-terminals
        this.terminals = new Set();     // The set of all terminals

        this.startProductions = this.grammar.filter(production => production[0] == 'S')

        this.grammar.forEach(production => {
            let lhs = production[0];
            this.nonTerminals.add(lhs);
            this.sigmaN.add(lhs);

            let rhs_arr = production.slice(1, production.length);
            rhs_arr.forEach(rhs => {
                let components = rhs.split(" ");
                components.forEach(component => {
                    this.sigmaN.add(component);
                });
            });
        });

        this.terminals = this.difference(this.sigmaN, this.nonTerminals);

        this.E = [];        // Earley sets initialized
        this.R = [];        // Queue R initialized
        this.Qmarked = [];  // Queue Q' initialized
        this.V = [];        // Queue V initialized       
    }

    parse(){
        // Allow for Backus-Naur form with a vertical choice bar |. There can therefor be more than one lhs-productions.
        this.startProductions.forEach(startProduction => {
            let rhs_arr = startProduction.slice(1, startProduction.length);
            rhs_arr.forEach(rhs => {
                let rhs_0 = rhs.split(" ")[0];
                // According to Scott ΣN is the set of all terminals and non-terminals. Since this set can be infinite and is in the theoretical realm
                // we simply check if the first token is a non-terminal
                if(this.nonTerminals.has(rhs_0)){ // THIS IS NOT WORKING - CHECK WHY TOMORROW.
                    if(this.E.length == 0)
                    {
                        this.E.push([['S', '· ' + rhs]]);
                    }
                    else
                    {
                        this.E[0].push(['S', '· ' + rhs]);
                    }
                }
            });
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

module.exports.EarleyScott = EarleyScott;