let parseStatus = (function(){
    let nextStepToShow = 0;
    let lastStepShown = 0;
    let totalSteps = 0;
    let E = [];
    let R = [];
    let Q = [];
    let Qmarked = [];
    let V = [];
    let parsingStarted = false;
    let final = "";

    function getArrayOfStringifiedEarleyItems(orgArray)
    {
        let innerArray = [];
        for(let j = 0; j < orgArray.length; j++)
        {
            innerArray.push(orgArray[j].toString())
        }
        
        return innerArray;
    }

    return {
        incrementNextStepToShow: function()
        {
            if(nextStepToShow == lastStepShown) nextStepToShow++;
            console.log("nextStepToShow incremented to " + nextStepToShow + ". lastStepShown = " + lastStepShown);
        },

        incrementLastStepShown: function()
        {
            if(nextStepToShow == lastStepShown + 1) lastStepShown++;
            console.log("lastStepShown incremented to " + lastStepShown + ". nextStepToShow = " + nextStepToShow);
        },

        getCurrentStep: function()
        {
            return nextStepToShow;
        },

        getLastStep: function()
        {
            return lastStepShown;
        },

        resetParseStatus: function()
        {
            nextStepToShow = 0;
            lastStepShown = 0;
            totalSteps = 0;
            E = [];
            R = [];
            V = [];
            Q = [];
            Qmarked = [];
            parsingStarted = true;
            final = "";
        },

        setTotalSteps: function(steps) // Not sure we will use this after all.
        {
            totalSteps = steps;
        },

        setE: function(e)
        {
            E = e;
        },

        setR: function(r)
        {
            R = r;
        },
        setV: function(v)
        {
            V = v;
        },
        setQ: function(q)
        {
            Q = q;
        },
        setQmarked: function(qmarked)
        {
            Qmarked = qmarked;
        },
        getE: function()
        {
            let outerArray = [];
            for(let i = 0; i < E.length; i++)
            {
                outerArray.push(getArrayOfStringifiedEarleyItems(E[i]));
            }
            return outerArray;
        },
        getR: function()
        {
            return R;
        },
        getV: function()
        {
            return V;
        },
        getQ: function()
        {
            return Q;
        },
        getQmarked: function()
        {
            return Qmarked;
        },
        getFinal: function()
        {
            if(final == "FAILURE" || final == "") return final;
            else
            {
                return getArrayOfStringifiedEarleyItems(final);
            }
            
        },
        canContinue: function()
        {
            if(nextStepToShow == lastStepShown)
            {
                return false;
            } 
            else return true;
        },
        isInStopState: function()
        {
            if(nextStepToShow == lastStepShown) return true;
            else return false;
        },
        parsingInProgress: function()
        {
            if(parsingStarted) return true;
            else return false;
        },
        setParsingDone: function()
        {
            parsingStarted = false;
        },
        setFinal: function(fin)
        {
            final = fin;
        },

    };
})();

module.exports.parseStatus = parseStatus;