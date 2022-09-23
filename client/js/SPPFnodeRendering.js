const CHAR_WIDTH = 6; // In pixels
const NODE_MARGIN_LR = 20; // Left and right margins pixels.
const NODE_MARGIN_TB = 10; // Top and bottom margins in pixels.
const NODE_PADDING_LR = 10; // Left and right padding within the node
const NODE_PADDING_TB = 10; // Top and bottom padding within the node
const NODE_ROW_MARGIN_TB = 10; // Top and bottom margin between each row of nodes.
const HEIGHT_FACTOR = 0.3; // Factor for calculating the height of each node which is drawn.
const SVG_AREA_PADDING_ALL = 10;
const PACKED_NODE_R = 5; // Radius of packed nodes

/*
*   Sets up the data structure which is used by the drawing mechanism. After setting it up removes duplicate terminals and non-terminals
*   and sorts the nodes in each row in ascending order.
*/
function determineCurrentSPPFstructure()
{
    // Deep copy with families
    let SPPFnodes_copy = copySPPFnodesMap();

    let SPPF_trees = [];

    // R1
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
    SPPFnodes.forEach(function (value) {
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

/*
*   Helper to make sure the calculation of the width for of each node is done in a uniform manner.
*/
function helperGetNodeWidth(key)
{
    return (key.length * CHAR_WIDTH) + (NODE_PADDING_LR * 2);
}

/*
*   Helper to make sure the calculation of the height for of each node is done in a uniform manner.
*/
function helperGetNodeHeight(key)
{
    return (key.length * CHAR_WIDTH) * HEIGHT_FACTOR + (NODE_PADDING_TB * 2);
}