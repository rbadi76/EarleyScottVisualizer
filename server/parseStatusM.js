let parseStatus = (function(){
    let nextStepToShow = 0;
    let lastStepShown = 0;
    let totalSteps = 0;
    let E = [];
    let R = [];
    let Q = [];
    let Qmarked = [];
    let V = [];

    return {
        incrementNextStepToShow: function()
        {
            if(nextStepToShow == lastStepShown) nextStepToShow++;
            console.log("nextStepToShow incremented to " + nextStepToShow);
        },

        incrementLastStepShown: function()
        {
            if(nextStepToShow == lastStepShown + 1) lastStepShown++;
            console.log("lastStepShown incremented to " + lastStepShown);
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
        },

        setTotalSteps: function(steps)
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
            return E;
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
        canContinue: function()
        {
            if(nextStepToShow == lastStepShown) return false;
            else return true;
        },
        isInStopState: function()
        {
            if(nextStepToShow == lastStepShown) return true;
            else return false;
        }
    };
})();

module.exports.parseStatus = parseStatus;