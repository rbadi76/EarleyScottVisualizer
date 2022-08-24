function renderNodes()
{
    console.log("Render nodes called.");

    let svgImageArea = document.getElementById("svgImgArea");
    let nodesArea = document.getElementById("SPPFnodesArea");
    console.log("Nodes area offset width: " + nodesArea.offsetWidth);
    console.log("Writing out the nodes saved in a set:")
    console.log(SPPFnodes);
}

class SPPFnode
{
    constructor(label, i, children)
    {
        this._label = label;
        this._i = i;
        this._children = children;
    }

    renderNode()
    {
        console.log("Bla");
    }
}
