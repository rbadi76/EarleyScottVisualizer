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
    constructor(label, i, j)
    {
        this._label = label;
        this._i = i;
        this._j = j;
        this._families = new Map();
    }

    addFamily(family)
    {
        if(family instanceof UnaryFamily || family instanceof BinaryFamily)
        {
            this._families.set(family.getKey(), family);
        }
        else
        {
            throw new Error("Family of a node can only bee of type UnaryFamily og BinaryFamily");
        }
        
    }

    familiesCount()
    {
        return this._families.size;
    }

    hasFamily(family)
    {
        if(family instanceof BinaryFamily)
        {
            if(this._families.has(family.getKey()) || this._families.has(family.getReverseKey())) return true;
            else return false;
        }
        else
        {
            if(this._families.has(family.getKey())) return true;
            else return false;
        }
    }

    // Is equal - meaning has the same label and start index and end index.
    isEqual(sppfNode)
    {
        if(sppfNode.label == this._label && sppfNode.i == this._i && sppfNode.j == this._j) return true;
        else return false;
    }

    // Is same meaning is equal and has the exact same families
    isSame(sppfNode)
    {
        if(sppfNode.isEqual(this))
        {
            if(sppfNode.familiesCount != this.familiesCount)
            {
                return false;
            }
            else
            {
                let sameness = true;
                const mapIter = this._families.keys();
                for(let i = 0; i < this._families.size; i++)
                {
                    let temp = mapIter.next().value;
                    if(!sppfNode.hasFamily(temp))
                    {
                        sameness = false;
                        break;
                    }
                }
                return sameness;
            }
        }
        else return false;
    }

    renderNode()
    {
        console.log("Rendered node " + this._label + ". It has now " + this._families.size + " families.");

        let svgArea = document.getElementById("svgImgArea");

        let sanitizedLabel;
        if(this._label.indexOf("::=") > 0) sanitizedLabel = this.sanitizeLabel(this._label);
        let newId = sanitizedLabel + "_" + this._i + "_" + this._j;

        // Check if node is already rendered by checking if an element with an id based on the label exists.
        // My idea now is to first let them appear in the corner and after all have been put on the svg element
        // Position them based on position in the map and the number of nodes present. Will think better of it tomorrow.

        /*
        All render node does is create the ellipse and text and give them an ID to be referrence later IF it
        does not exist already.

        Another function, not in this class takes care of positioning them in the following manner:

        It counts the number of nodes in the map (nodeCount)
        It goes through the map in reverse order (top down from the SPPFs perspective).

        First determine how many disjoint trees we have and maximum number of levels of any tree. 
        This is done in the following manner:

        Copy the SPPFNodes map, call it SPPFNodes_copy.
        If it is not empty:
            Create an array, call it SPPF_trees.
            #R1 Add an array to it (outer container).
            push an array (inner container)
            push the key of the node at the bottom of SPPFNodes_copy to the inner container.
            If the node has children, for the first child push an array to the outer container.
            for each child push its key to the inner container.
            Remove the parent node from SPPFNodes_copy
            
            #R2 Now go to the last array or SPPF_trees (outer container), and last array of it (inner container with children)
            and and for each node key there check for children in those nodes contained in SPPFNodes_copy 
            If the node has children, for the first child push an array to the outer container.
            for each child push its key to the inner container.
            Remove the parent node from SPPFNodes_copy
            If SPPFNodes_copy is empty stop.
            Otherwise check if the last inner array has been checked for children
            If yes and goto #R1
            If no goto #R2

            When this is done the number of outer arrays in SPPF_trees determines the number of trees/areas for trees
            The number of inner arrays tells you how many levels each tree has and the number of nodes in each level.
            This should aid you in drawing the nodes.

            Later we draw the connectors. How to do that will be determined later.

            On Monday Try stepping through this pseudocode by using Tree rendering algrorithm test.txt and see if it works as expected.
        
        */


        if(!document.getElementById(newId))
        {
            let middleOfWidth;
            let middleOfHeight;
            if(!document.getElementsByName("ELLIPSE").length)
            {
                middleOfWidth = svgArea.clientWidth / 2;
                middleOfHeight = svgArea.clientHeight / 2;
            }

            let cx = middleOfWidth;
            let cy = middleOfHeight;

            let text_x = middleOfWidth;
            let text_y = middleOfHeight;
            

            // If it does not, render it by creating an SVG elipse with label as text
            let newEllipse = document.createElementNS("http://www.w3.org/2000/svg", "ellipse");
            newEllipse.setAttribute("id", newId);
            newEllipse.setAttribute("cx", cx);
            newEllipse.setAttribute("cy", cy);
            newEllipse.setAttribute("rx", 60);
            newEllipse.setAttribute("ry", 25);

            let newEllipseLabel = document.createElementNS("http://www.w3.org/2000/svg", "text");
            newEllipseLabel.setAttribute("x", text_x);
            newEllipseLabel.setAttribute("y", text_y);
            newEllipseLabel.setAttribute("id", newId + "_text");

            let newEllipseLabelText = document.createTextNode("{" + this._label + ", " + this._i + ", " + this._j + "}");
            newEllipseLabel.appendChild(newEllipseLabelText);


            svgArea.appendChild(newEllipse);
            svgArea.appendChild(newEllipseLabel);
            //svgArea.appendChild("Sorry, your browser does not support inline SVG.");
        }      

        // Else check if children have been rendered
        //      If they have not, render each child not already rendered and draw a line between parent and child.
    }

    sanitizeLabel(label) {
        label = label.replace("=", "");
        label = label.replace("(", "");
        label = label.replace(")", "");
        label = label.replaceAll(" ", "-");
        label = label.replace("·", ".");
        return label;
    }

    get label()
    {
        return this._label;
    }

    get i()
    {
        return this._i;
    }

    get j()
    {
        return this._j;
    }

    get families()
    {
        return this._families;
    }

    toString()
    {
        return "(" + this._label + ", " + this._i + ", " + this._j + ")";
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

    getKey()
    {
        return this._node.toString();
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

    getKey()
    {
        return "(" + this._node.toString() + ", " + this._node2.toString() + ")";
    }

    getReverseKey()
    {
        "(" + this._node2.toString() + ", " + this._node.toString() + ")";
    }
}
 
