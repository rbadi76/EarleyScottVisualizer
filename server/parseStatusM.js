let parseStatus = (function(){
    let nextStepToShow = 0;
    let lastStepShown = 0;
    let totalSteps = 0;
    let E = [];
    let R = [];
    let Q = [];
    let Qmarked = [];
    let V = [];
    let H = [];
    let parsingStarted = false;
    let final = "";
    let abort = false;

    function getArrayOfStringifiedItems(orgArray)
    {
        let innerArray = [];
        for(let j = 0; j < orgArray.length; j++)
        {
            innerArray.push(orgArray[j].toString())
        }
        
        return innerArray;
    }

    function getArrayOfNodeArrays(nodeArray)
    {
        let innerArray = [];
        for(let j = 0; j < nodeArray.length; j++)
        {
            innerArray.push(nodeArray[j].nodeWithFamiliesToArray());
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
            abort = false;
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
        setH: function(h)
        {
            H = h;
        },
        getE: function()
        {
            let outerArray = [];
            for(let i = 0; i < E.length; i++)
            {
                outerArray.push(getArrayOfStringifiedItems(E[i]));
            }
            return outerArray;
        },
        getR: function()
        {
            return getArrayOfStringifiedItems(R);
        },
        getV: function()
        {
            return getArrayOfStringifiedItems(V);
        },
        getVWithFamilies: function()
        {
            return getArrayOfNodeArrays(V);
        },
        getQ: function()
        {
            return getArrayOfStringifiedItems(Q);
        },
        getQmarked: function()
        {
            return getArrayOfStringifiedItems(Qmarked);
        },
        getH: function()
        {
            return getArrayOfStringifiedItems(H);
        },
        getFinal: function()
        {
            if(final == "FAILURE" || final == "") return final;
            else
            {
                return getArrayOfStringifiedItems(final);
            }
            
        },
        canContinue: function()
        {
            if(nextStepToShow == lastStepShown && !abort)
            {
                return false;
            } 
            else return true;
        },
        isInStopState: function()
        {
            if(nextStepToShow == lastStepShown && !abort) return true;
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
        abort: function() // Effectively lets the algorithm run it's course and finish.
        {
            abort = true;
        }
    };
})();

module.exports.parseStatus = parseStatus;