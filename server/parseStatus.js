class ParseStatus
{
    constructor(totalSteps)
    {
        this._lastStep = 0;
        this._currentStep = 0;
        this._totalSteps = totalSteps;
    }

    get lastStep()
    {
        return this._lastStep;
    }

    get currentStep()
    {
        return this._currentStep;
    }

    takeNextStep()
    {
        this._currentStep++;
    }

    makeReadyForNextStep()
    {
        this._lastStep++;
    }
}