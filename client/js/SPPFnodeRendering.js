function determineCurrentSPPFstructure()
{
    // Deep copy with families
    let SPPFnodes_copy = copySPPFnodesMap();

    let SPPF_trees = [];

    // R1
    let lastInnerArrayHasBeenCheckedForChildren = true; // Must be true to begin, will change later.
    while(SPPFnodes_copy.size)
    {
        //console.log("In outer while. SPPFnodes_copy.size=" + SPPFnodes_copy.size)
        SPPF_trees.push([]); // Outer array added
        let outerArray = SPPF_trees[SPPF_trees.length - 1];
        outerArray.push(new Set()); // Inner Set added

        // Get the last item added to the SPPFnodes_copy map.
        let iterator = SPPFnodes_copy.entries();
        for(let i = 1; i < SPPFnodes_copy.size; i++) // The only way to get to the last item of a Map
        {
            iterator.next();
        }
        let keyOfBottomItem = iterator.next().value[0];
        outerArray[0].add(keyOfBottomItem); // push the key of the node at the bottom of SPPFNodes_copy to the inner container.
        let bottomNode = SPPFnodes_copy.get(keyOfBottomItem);
        if(bottomNode.families.size)
        {
            // If the node has children, for the first child push an Set to the outer container.
            outerArray.push(new Set());

            // for each child push its key to the inner container.
            bottomNode.families.forEach(family => {
                outerArray[1].add(family.node.toString());
                if(family instanceof BinaryFamily)
                {
                    outerArray[1].add(family.node2.toString());
                }                
            });
            SPPFnodes_copy.delete(keyOfBottomItem); // Remove the parent node from SPPFNodes_copy
        }

        let checkForChildren = true; 
        while(SPPFnodes_copy.size && checkForChildren)
        {
            //console.log("In inner while. SPPFnodes_copy.size=" + SPPFnodes_copy.size)
            // R2 Now go to the last array of SPPF_trees (outer container), and last array of it (inner container with children)
            let SPPF_trees_outerArrayLastIdx = SPPF_trees.length - 1;
            let SPPF_trees_innerArrayLastIdx = SPPF_trees[SPPF_trees_outerArrayLastIdx].length - 1;

            checkForChildren = false;
            // and for each node key there 
            SPPF_trees[SPPF_trees_outerArrayLastIdx][SPPF_trees_innerArrayLastIdx].forEach(key => {
                // check for children in those nodes contained in SPPFNodes_copy
                if(SPPFnodes_copy.has(key)) // Check if SPPFnodes_copy has the key as it might have been deleted if already processed
                {
                    let nodeToCheck = SPPFnodes_copy.get(key);
                    // If any node has children, for the first child push an array to the outer container.
                    if(nodeToCheck.families.size && !checkForChildren) // Only push once when first child is found
                    {
                        checkForChildren = true;
                        outerArray.push(new Set());
                    }
                    // for each child push its key to the inner container (if it no longer exists in SPPFNodes_copy, do nothing as we have a circular reference)
                    if(nodeToCheck.families.size)
                    {
                        nodeToCheck.families.forEach(family => {
                            // To ensure correct ordering we check for existence and delete the previous entry before we try adding again.
                            let innerSet = outerArray[SPPF_trees_innerArrayLastIdx + 1];
                            innerSet.add(family.node.toString());
                            if(family instanceof BinaryFamily)
                            {
                                innerSet.add(family.node2.toString());
                            }
                        });
                    }
                    // Remove the parent node from SPPFNodes_copy
                    SPPFnodes_copy.delete(key);
                }
            });

            // Otherwise check if the last inner array has been checked for children
            // If yes and goto #R1
            // If no goto #R2
        }
    }

    console.log("Tree before sorting and pruning:")
    console.log(writeOutSPPFtreesKeys(SPPF_trees));

    // Pruning starts
    // Delete duplicate terminals at upper levels
    let outerArrayLastIndex = SPPF_trees.length - 1;
    let innerArrayLastIndex;
    for(let i = outerArrayLastIndex; i >= 0; i--)
    {
        innerArrayLastIndex = SPPF_trees[i].length - 1;
        for(let j = innerArrayLastIndex; j >= 0; j--)
        {
            let theSet = SPPF_trees[i][j];
            let iterator = theSet.values();
            for(const key of iterator)
            {
                if(!SPPFnodes.has(key)) // This is a terminal if the node is not found in SPPFnodes as it only contains non-terminals
                {
                    for(let k = j - 1; k >= 0; k--)
                    {
                        if(SPPF_trees[i][k].has(key))
                        {
                            SPPF_trees[i][k].delete(key);
                        }
                    }     
                }
            }
        }
    }

    // Delete duplicate non-terminals at lower levels
    for(let i = 0; i <= outerArrayLastIndex; i++)
    {
        innerArrayLastIndex = SPPF_trees[i].length - 1;
        for(let j = 0; j <= innerArrayLastIndex; j++)
        {
            let theSet = SPPF_trees[i][j];
            let iterator = theSet.values();
            for(const key of iterator)
            {    
                if(SPPFnodes.has(key)) // This is a non-terminal if the node is found in SPPFnodes as it only contains non-terminals
                {
                    for(let k = j + 1; k <= innerArrayLastIndex; k++)
                    {
                        if(SPPF_trees[i][k].has(key))
                        {
                            SPPF_trees[i][k].delete(key);
                        }
                    }
                }
            }
        }
    }

    // Sort the nodes in ascending order according to start and end indices
    for(let i = 0; i <= outerArrayLastIndex; i++)
    {
        innerArrayLastIndex = SPPF_trees[i].length - 1;
        for(let j = 0; j <= innerArrayLastIndex; j++)
        {
            let theSet = SPPF_trees[i][j];
            let theNewSet = new Set();
            while(theSet.size)
            {
                let iterator = theSet.values();
                let nodeToCompare = null;
                for(const key of iterator)
                {    
                    let node;
                    // Find the start and end indices of the next node
                    if(SPPFnodes.has(key)) // This is a non-terminal if the node is found in SPPFnodes as it only contains non-terminals
                    {
                        node = SPPFnodes.get(key);
                    }
                    else // This is terminal, we need to search for the parent and then get the indices of the correct child - a bit more complex as SPPFnodes does not contain children
                    {
                        // Start searching the sets above
                        for(let k = j - 1; k >= 0 ; k--)
                        {
                            let aSetAbove = SPPF_trees[i][k];
                            let itsIterator = aSetAbove.values();
                            let childFound = false;
                            for(const itsKey of itsIterator)
                            {
                                if(SPPFnodes.has(itsKey))
                                {
                                    let possibleParentsNode = SPPFnodes.get(itsKey);
                                    if(possibleParentsNode.hasChild(key))
                                    {
                                        node = possibleParentsNode.getChild(key);
                                        childFound = true;
                                        break;
                                    }
                                }
                            }
                            if(childFound) break;
                        }
                    }
                    if(nodeToCompare === null) nodeToCompare = node;
                    else
                    {
                        if(node.i < nodeToCompare.i)
                        {
                            nodeToCompare = node;
                        } 
                    }    
                }
                theNewSet.add(nodeToCompare.toString());
                theSet.delete(nodeToCompare.toString());
                nodeToCompare = null;
            }
            SPPF_trees[i][j] = theNewSet;            
        }
    }

    console.log("Tree after sorting and pruning:")
    console.log(writeOutSPPFtreesKeys(SPPF_trees));
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

    hasChild(key)
    {
        if(this._families.size > 0)
        {
            let childFound = false;
            let iterator = this._families.values();
            for(const family of iterator)
            {
                if(family instanceof BinaryFamily)
                {
                    if(family.node2.toString() == key) 
                    {
                        return true;
                    }
                }
                if(family.node.toString() == key) 
                {
                    return true;
                }
            }
            return false;
        }
    }

    getChild(key)
    {
        if(this._families.size > 0)
        {
            let childFound = false;
            let iterator = this._families.values();
            for(const family of iterator)
            {
                if(family instanceof BinaryFamily)
                {
                    if(family.node2.toString() == key) 
                    {
                        return family.node2;
                    }
                }
                if(family.node.toString() == key) 
                {
                    return family.node;
                }
            }
        }
        return null;
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
        //console.log("Rendered node " + this._label + ". It has now " + this._families.size + " families.");

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
        If SPPFNodes_copy is not empty:
            Create an array, call it SPPF_trees.
            #R1 Add an array to it (outer container).
            push an array (inner container)
            push the key of the node at the bottom of SPPFNodes_copy to the inner container.
            If the node has children, for the first child push an array to the outer container.
            for each child push its key to the inner container.
            Remove the parent node from SPPFNodes_copy
            
            #R2 Now go to the last array of SPPF_trees (outer container), and last array of it (inner container with children)
            and and for each node key there check for children in those nodes contained in SPPFNodes_copy 
            If any node has children, for the first child push an array to the outer container.
            for each child push its key to the inner container (if it no longer exists in SPPFNodes_copy, do nothing as we have a circular reference)
            Remove the parent node from SPPFNodes_copy
            If SPPFNodes_copy is empty stop.
            Otherwise check if the last inner array has been checked for children
            If yes and goto #R1
            If no goto #R2

            Finally remove all duplicate terminals at upper levels, leaving them at the leaves and remove all duplicate non-terminal leaves leaving the top most.

            When this is done the number of outer arrays in SPPF_trees determines the number of trees/areas for trees
            The number of inner arrays tells you how many levels each tree has and the number of nodes in each level.
            This should aid you in drawing the nodes.

            Later we draw the connectors. How to do that will be determined later.
            Also later we will calculate the positioning based on the SPPF_trees array.

            On Monday Try stepping through this pseudocode by using Tree rendering algrorithm test.txt and see if it works as expected.
            --> Done. Small changes need.
        
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
 
function copySPPFnodesMap() {
    let SPPFNodes_copy = new Map();
    SPPFnodes.forEach(function (value, key) {
        let newNode = new SPPFnode(value.label, value.i, value.j);
        if (value._families.size) {
            value._families.forEach(family => {
                if (family instanceof BinaryFamily) {
                    let node1 = new SPPFnode(family._node.label, family._node.i, family._node.j);
                    let node2 = new SPPFnode(family._node2.label, family._node2.i, family._node2.j);
                    let binaryFamilyCopy = new BinaryFamily(node1, node2);
                    newNode.addFamily(binaryFamilyCopy);

                }

                else {
                    let node = new SPPFnode(family._node.label, family._node.i, family._node.j);
                    let unaryFamilyCopy = new UnaryFamily(node);
                    newNode.addFamily(unaryFamilyCopy);
                }
            });
        }
        SPPFNodes_copy.set(newNode.toString(), newNode);
    });
    return SPPFNodes_copy;
}

function writeOutSPPFtreesKeys(theTree)
{
    let outerArrayLastIndex = theTree.length - 1;
    let innerArrayLastIndex;
    let theString = "";
    for(let i = 0; i <= outerArrayLastIndex; i++)
    {
        theString += "[\n";
        innerArrayLastIndex = theTree[i].length - 1;
        for(let j = 0; j <= innerArrayLastIndex; j++)
        {
            theString += "[";
            let theSet = theTree[i][j];
            let iterator = theSet.values();
            for(const key of iterator)
            {    
                theString += key + ", ";
            }
            theString += "]\n";
        }

        theString += "]";
    }
    return theString;
}

