const CHAR_WIDTH = 6; // In pixels
const NODE_MARGIN_LR = 20; // Left and right margins pixels.
const NODE_MARGIN_TB = 10; // Top and bottom margins in pixels.
const NODE_PADDING_LR = 10; // Left and right padding within the node
const NODE_PADDING_TB = 10; // Top and bottom padding within the node
const HEIGHT_FACTOR = 0.3; // Factor for calculating the height of each node which is drawn.
const TREE_AREA_ROW_PADDING_LR = 10;
const SVG_AREA_PADDING_ALL = 10;



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
                    let node = getNodeFromKey(key, j, SPPF_trees[i]);
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

    return SPPF_trees;
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

    renderNode(x, y)
    {
        let svgArea = document.getElementById("svgImgArea");

        let sanitizedLabel;
        if(this._label.indexOf("::=") > 0) sanitizedLabel = this.sanitizeLabel(this._label);
        let newId = sanitizedLabel + "_" + this._i + "_" + this._j;

        let newEllipse;
        let newEllipseLabelText;
        let newEllipseLabel;
        if(!document.getElementById(newId))
        {
        // If it does not, render it by creating an SVG elipse with label as text
            newEllipse = document.createElementNS("http://www.w3.org/2000/svg", "ellipse");
            newEllipse.setAttribute("id", newId);
            newEllipseLabelText = document.createTextNode("{" + this._label + ", " + this._i + ", " + this._j + "}");
            newEllipseLabel = document.createElementNS("http://www.w3.org/2000/svg", "text");
            newEllipseLabel.setAttribute("id", newId + "_text");
            newEllipseLabel.appendChild(newEllipseLabelText);
            svgArea.appendChild(newEllipse);
            svgArea.appendChild(newEllipseLabel);
        }
        else
        {
            newEllipse = document.getElementById(newId);
            newEllipseLabel = document.getElementById(newId + "_text")
        } 
        
        newEllipse.setAttribute("cx", x + this.width / 2);
        newEllipse.setAttribute("cy", y + this.height / 2);
        newEllipse.setAttribute("rx", this.width / 2);
        newEllipse.setAttribute("ry", this.height / 2);
       
        let nelBBox = newEllipseLabel.getBoundingClientRect();

        newEllipseLabel.setAttribute("x", x + NODE_PADDING_LR);
        newEllipseLabel.setAttribute("y", y + NODE_PADDING_TB + ((this.height - nelBBox.height) / 2 + 5));
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

    get height()
    {
        return helperGetNodeHeight(this.toString());
    }

    get width()
    {
        return helperGetNodeWidth(this.toString());
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

/*
*   Get the node by index from SPPFnodes.
*/
function getNodeFromKey(key, rowIdx, arrayOfSets) {
    let node;
    // Find the start and end indices of the next node
    if (SPPFnodes.has(key)) // This is a non-terminal if the node is found in SPPFnodes as it only contains non-terminals
    {
        node = SPPFnodes.get(key);
    }
    else // This is terminal, we need to search for the parent and then get the indices of the correct child - a bit more complex as SPPFnodes does not contain children
    {
        // Start searching the sets above
        for (let k = rowIdx - 1; k >= 0; k--) {
            let aSetAbove = arrayOfSets[k];
            let itsIterator = aSetAbove.values();
            let childFound = false;
            for (const itsKey of itsIterator) {
                if (SPPFnodes.has(itsKey)) {
                    let possibleParentsNode = SPPFnodes.get(itsKey);
                    if (possibleParentsNode.hasChild(key)) {
                        node = possibleParentsNode.getChild(key);
                        childFound = true;
                        break;
                    }
                }
            }
            if (childFound)
                break;
        }
    }
    return node;
}

/*
*   For deep-copying SPPFnodesMap
*/ 
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

/* 
*   Used for debugging as console.log writes a reference to the object which may change. This writes out a snapshot for a given
*   point in time.
*/
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

class SVG_area
{
    constructor(maxWidth)
    {
        this._treeAreaRows = [];
        this._maxWidth = maxWidth;
    }

    addTreeAreaRow(treeAreaRow)
    {
        treeAreaRow.width = this._maxWidth - (TREE_AREA_ROW_PADDING_LR * 2);
        this._treeAreaRows.push(treeAreaRow);
    }

    get lastTreeAreaRow()
    {
        return this._treeAreaRows[this._treeAreaRows.length - 1];
    }

    get treeAreaRows()
    {
        return this._treeAreaRows;
    }

    render()
    {
        let svgImgArea = document.getElementById("svgImgArea");
        svgImgArea.setAttribute("width", this._maxWidth);
        let svgImgAreaHeight = 0;
        this._treeAreaRows.forEach(treeAreaRow => {
            svgImgAreaHeight += treeAreaRow.height;
        });
        svgImgArea.setAttribute("height", svgImgAreaHeight + (SVG_AREA_PADDING_ALL * 2));

        let outBBBox = svgImgArea.getBoundingClientRect(); 
        let nextX = SVG_AREA_PADDING_ALL;
        let nextY = SVG_AREA_PADDING_ALL;
        let nextWidth = outBBBox.width - (SVG_AREA_PADDING_ALL * 2);
        this._treeAreaRows.forEach(treeAreaRow => {
            treeAreaRow.render(nextX, nextY, nextWidth);
            nextY = treeAreaRow.height + nextY;
        });

    }
}

class TreeAreaRow
{
    constructor()
    {
        this._treeAreas = [];
        this._width = 0;
    }

    addTreeArea(treeArea)
    {
        this._treeAreas.push(treeArea);
    }

    get height()
    {
        let maxHeight = 0;
        this._treeAreas.forEach(treeArea => {
            let height = treeArea.height;
            if(maxHeight < height) maxHeight = height;
        });
        return maxHeight;
    }

    get treeCount()
    {
        return this._treeAreas.length;
    }

    set width(newWidth)
    {
        this._width = newWidth;
    }

    get availableWidth()
    {
        let usedSpace = 0;
        this._treeAreas.forEach(treeArea => {
            usedSpace += treeArea.width;
        });
        return this._width - usedSpace;
    }

    render(x, y, width)
    {
        let svgImgArea = document.getElementById("svgImgArea");  
        let newRect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        newRect.setAttribute("class", "treeAreaRowRect");
        newRect.setAttribute("x", x);
        newRect.setAttribute("y", y);
        newRect.setAttribute("width", width);
        newRect.setAttribute("height", this.height);
        svgImgArea.appendChild(newRect);
        x = x + this.availableWidth / 2;
        this._treeAreas.forEach(treeArea => {
            treeArea.render(x, y);
            x += treeArea.width;
        });
    }
}

class TreeArea
{
    constructor(arrayOfSets)
    {
        this._width = 0;
        this._height = 0;
        this._arrayOfSets = arrayOfSets;
    }

    get width()
    {
        if(this._width == 0)
        {
            let maxWidth = 0;
            this._arrayOfSets.forEach(set => {
                let iterator = set.values();
                let rowWidth = 0;
                for(const key of iterator)
                {
                    let nodeWidth = helperGetNodeWidth(key) + (NODE_MARGIN_LR * 2);
                    rowWidth += nodeWidth;
                }
                if(maxWidth < rowWidth) maxWidth = rowWidth;
            });
            this._width = maxWidth;
            return maxWidth;
        }
        else return this._width;

    }

    get height()
    {
        if(this._height == 0)
        {
            // Calculate the height of the area according to pseudocode using the new member property of SPPFnode class (height)
            let totalHeight = 0;
            let rowIdx = 0;
            this._arrayOfSets.forEach(set => {
                let iterator = set.values();
                let rowHeight = 0;

                for(const key of iterator)
                {
                    let node = getNodeFromKey(key, rowIdx, this._arrayOfSets);
                    if(rowHeight < helperGetNodeHeight(key) + (NODE_MARGIN_TB * 2)) rowHeight = helperGetNodeHeight(key) + (NODE_MARGIN_TB * 2);
                }
                totalHeight += rowHeight;
                rowIdx++;
            });
            
            this._height = totalHeight;
            return totalHeight;
        }
        else return this._height;

    }

    render(x, y)
    {
        let svgImgArea = document.getElementById("svgImgArea");  
        let newRect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        newRect.setAttribute("class", "treeAreaRect");
        newRect.setAttribute("x", x);
        newRect.setAttribute("y", y);
        newRect.setAttribute("width", this.width);
        newRect.setAttribute("height", this.height);
        svgImgArea.appendChild(newRect);
        let rowIdx = 0;
        this._arrayOfSets.forEach(set => {
            // Find the available space for each row
            let widthForAllNodes = 0;
            let maxNodeHeight = 0;
            let iterator = set.values();
            for (const itsKey of iterator) 
            {
                let node = getNodeFromKey(itsKey, rowIdx, this._arrayOfSets);
                if(node.height > maxNodeHeight) maxNodeHeight = node.height;
            }

            // Now we can position and render the nodes
            iterator = set.values();
            for (const itsKey of iterator) 
            {
                let node = getNodeFromKey(itsKey, rowIdx, this._arrayOfSets);
                node.renderNode(x + NODE_MARGIN_LR, y + NODE_MARGIN_TB);
                x = x + node.width + NODE_MARGIN_LR * 2;
            }

            y = y + maxNodeHeight + NODE_MARGIN_TB;
            rowIdx++;
        });
    }
}

function helperGetNodeWidth(key)
{
    return (key.length * CHAR_WIDTH) + (NODE_PADDING_LR * 2);
}

function helperGetNodeHeight(key)
{
    return (key.length * CHAR_WIDTH) * HEIGHT_FACTOR + (NODE_PADDING_TB * 2);
}