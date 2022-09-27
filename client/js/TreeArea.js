class TreeArea {
    constructor(arrayOfSets, id) {
        this._width = 0;
        this._height = 0;
        this._arrayOfSets = arrayOfSets;
        this._id = id;
    }

    get width() {
        if (this._width == 0) {
            let maxWidth = 0;
            this._arrayOfSets.forEach(set => {
                let iterator = set.values();
                let rowWidth = 0;
                for (const key of iterator) {
                    let nodeWidth = helperGetNodeWidth(key) + (NODE_MARGIN_LR * 2);
                    rowWidth += nodeWidth;
                }
                if (maxWidth < rowWidth)
                    maxWidth = rowWidth;
            });
            this._width = maxWidth;
            return maxWidth;
        }
        else return this._width;
    }

    get height() {
        if (this._height == 0) {
            // Calculate the height of the area according to pseudocode using the new member property of SPPFnode class (height)
            let totalHeight = 0;
            let rowIdx = 0;
            this._arrayOfSets.forEach(set => {
                let iterator = set.values();
                let rowHeight = 0;

                for (const key of iterator) {
                    let node = getNodeFromKey(key, rowIdx, this._arrayOfSets);
                    if (rowHeight < helperGetNodeHeight(key) + (NODE_MARGIN_TB * 2) + (NODE_ROW_MARGIN_TB * 2))
                        rowHeight = helperGetNodeHeight(key) + (NODE_MARGIN_TB * 2) + (NODE_ROW_MARGIN_TB * 2);
                }

                totalHeight += rowHeight;
                rowIdx++;
            });

            this._height = totalHeight;
            return totalHeight;
        }
        else
            return this._height;

    }

    render(x, y) {
        let svgImgArea = document.getElementById(SVG_IMG_ID);
        let newRect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        newRect.setAttribute("class", "treeAreaRect");
        newRect.setAttribute("x", x);
        newRect.setAttribute("y", y);
        newRect.setAttribute("width", this.width);
        newRect.setAttribute("height", this.height);
        svgImgArea.appendChild(newRect);
        let rowIdx = 0;
        let maxNodeHeight;
        let iterator;
        let nodePosX;
        let startY = y;
        this._arrayOfSets.forEach(set => {
            
            // x is now the top left corner of the area.
            // Calculate the position of the first node in the row
            nodePosX = x + (this.width - this.getWidthForAllNodes(set)) / 2;
            startY = startY + NODE_MARGIN_TB + NODE_ROW_MARGIN_TB;
            maxNodeHeight = this.getMaxNodeHeight(set, rowIdx);

            // Now we can position and render the nodes
            iterator = set.values();
            for (const key of iterator) {
                let node = getNodeFromKey(key, rowIdx, this._arrayOfSets);
                let nodeYPos = startY + (maxNodeHeight - node.height) / 2;
                node.renderNode(nodePosX + NODE_MARGIN_LR, nodeYPos, this._id);
                nodePosX = nodePosX + node.width + NODE_MARGIN_LR * 2;
            }

            startY = startY + maxNodeHeight + NODE_MARGIN_TB + NODE_ROW_MARGIN_TB;
            rowIdx++;
        });

        // We must iterate again through the sets as we cannot draw the lines and packed nodes until all the nodes have been drawn.
        rowIdx = 0;
        this._arrayOfSets.forEach(set => {
            maxNodeHeight = this.getMaxNodeHeight(set, rowIdx);
            iterator = set.values();
            for(const key of iterator)
            {
                let svgBBox = document.getElementById(SVG_IMG_ID).getBoundingClientRect();
                let svgTopLeftPoint = new DOMPoint(svgBBox.x, svgBBox.y);
                
                let node = getNodeFromKey(key, rowIdx, this._arrayOfSets);
                let nodeBBox = document.getElementById(this.prefixTreeAreaIdToNodeId(node.getSanitizedHtmlId())).getBoundingClientRect();
                let nodeTopLeftPoint = new DOMPoint(nodeBBox.x - svgTopLeftPoint.x, nodeBBox.y - svgTopLeftPoint.y);  // Top left point of node within SVG image
                let nodeMiddlePoint = new DOMPoint(nodeTopLeftPoint.x + nodeBBox.width / 2, nodeTopLeftPoint.y + nodeBBox.height / 2);          
                let nodeAreaStartX = nodeTopLeftPoint.x - NODE_MARGIN_LR;
                if(node.familiesCount > 1)
                {    
                    let nodeAreaSegmentSizeX = (nodeBBox.width + (NODE_MARGIN_LR * 2)) / (node.familiesCount * 2) - PACKED_NODE_R;
                    let packedNodeX = nodeAreaStartX + nodeAreaSegmentSizeX;
                    let packedNodeY = nodeTopLeftPoint.y + nodeBBox.height + NODE_MARGIN_TB + NODE_ROW_MARGIN_TB - PACKED_NODE_R;
                    let counter = 1;
                    for(let [key, value] of node.families)
                    {
                        let idForPackedNode = this.prefixTreeAreaIdToNodeId(node.getSanitizedHtmlId()) + "_pn" + counter;
                        this.renderPackedNode(packedNodeX, packedNodeY, PACKED_NODE_R, idForPackedNode);
                        
                        // Draw line from node to packed node
                        this.renderPath(nodeMiddlePoint.x, nodeMiddlePoint.y, this.prefixTreeAreaIdToNodeId(node.getSanitizedHtmlId()) + "_line2PNode_" + counter, 
                            idForPackedNode, "toPackedNode", this.prefixTreeAreaIdToNodeId(node.getSanitizedHtmlId())), false;

                        // Check if the next line goes back to the parent
                        let useCurve = false;
                        if(node.isEqual(value.node)) useCurve = true;

                        // Draw line from packed node to child/children
                        this.renderPath(packedNodeX + PACKED_NODE_R, packedNodeY + PACKED_NODE_R, 
                            this.prefixTreeAreaIdToNodeId(node.getSanitizedHtmlId()) + "_lineA_" + counter, 
                            this.prefixTreeAreaIdToNodeId(value.node.getSanitizedHtmlId()), "fromPackedNode", idForPackedNode, useCurve);
                        if(value instanceof BinaryFamily)
                        {
                            useCurve = false;
                            if(node.isEqual(value.node2)) useCurve = true;
                            this.renderPath(packedNodeX + PACKED_NODE_R, packedNodeY + PACKED_NODE_R, 
                                this.prefixTreeAreaIdToNodeId(node.getSanitizedHtmlId()) + "_lineB_" + counter, 
                                this.prefixTreeAreaIdToNodeId(value.node2.getSanitizedHtmlId()), "fromPackedNode", idForPackedNode, useCurve); 
                        }
                        
                        // Update for next iteration
                        packedNodeX += nodeAreaSegmentSizeX * 2 + 2 * PACKED_NODE_R;
                        counter++;
                    }
                }
                else if (node.familiesCount == 1)
                {
                    let iterator = node.families.values();
                    let family = iterator.next().value;
                    this.renderPath(nodeMiddlePoint.x, nodeMiddlePoint.y, this.prefixTreeAreaIdToNodeId(node.getSanitizedHtmlId()) + "_lineA", 
                        this.prefixTreeAreaIdToNodeId(family.node.getSanitizedHtmlId()), "toNode", this.prefixTreeAreaIdToNodeId(node.getSanitizedHtmlId()), false);
                    if(family instanceof BinaryFamily)
                    {
                        this.renderPath(nodeMiddlePoint.x, nodeMiddlePoint.y, this.prefixTreeAreaIdToNodeId(node.getSanitizedHtmlId()) + "_lineB", 
                            this.prefixTreeAreaIdToNodeId(family.node2.getSanitizedHtmlId()), "toNode", 
                            this.prefixTreeAreaIdToNodeId(node.getSanitizedHtmlId()), false);
                    }          
                }
            } 
            rowIdx++;
        });
    }

    getMaxNodeHeight(set, rowIdx) 
    {
        let maxNodeHeight = 0;
        let iterator = set.values();
        for (const key of iterator) {
            let node = getNodeFromKey(key, rowIdx, this._arrayOfSets);
            if (node.height > maxNodeHeight)
                maxNodeHeight = node.height;
        }
        return maxNodeHeight;
    }

    getWidthForAllNodes(set)
    {
        let iterator = set.values();
        let widthForAllNodesInTheRow = 0;
        let nodeWidth = 0;
        for (const key of iterator) {;
            nodeWidth = helperGetNodeWidth(key) + (NODE_MARGIN_LR * 2);
            widthForAllNodesInTheRow += nodeWidth;
        }
        return widthForAllNodesInTheRow;
    }

    /*
    *   Renders a packed node. Variables x and y denote position of top left corner's bounding box.
    */
    renderPackedNode(x, y, r, id)
    {
        let svgArea = document.getElementById(SVG_IMG_ID);
        let svgAreaBBox = svgArea.getBoundingClientRect();

        let circle;
        if (!document.getElementById(id)) {
            // If it does not, render it by creating an SVG elipse with label as text
            circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            circle.setAttribute("id", id);
            svgArea.appendChild(circle);
        }
        else {
            circle = document.getElementById(id);
        }

        circle.setAttribute("cx", x + r);
        circle.setAttribute("cy", y + r);
        circle.setAttribute("r", r);
    }

    renderPath(startX, startY, lineId, childId, cssClass, parentId, useCurve = false)
    {

        /*
        * Finally figured out how to mask out the lines thanks to this article.
        * https://stackoverflow.com/questions/11404391/invert-svg-clip-show-only-outside-path
        */

        let svgArea = document.getElementById(SVG_IMG_ID);
        let child = document.getElementById(childId);
        let parent = document.getElementById(parentId);
        let childBBox = child.getBoundingClientRect();
        let svgAreaBBox = svgArea.getBoundingClientRect(); // Use to deduct x and y values as x2 and y2 attributes start at top left of SVG image, the main page. 
        let parentBBox = parent.getBoundingClientRect();

        // Mask out the line within the child node
        let mask = this.createMainMask();
        if(!document.getElementById(childId + "_clip"))
        {
            let rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
            rect.setAttribute("id", childId + "_clip");
            rect.setAttribute("x", childBBox.x - svgAreaBBox.x);
            rect.setAttribute("y", childBBox.y - svgAreaBBox.y);
            if(child.nodeName == "ellipse")
            {
                rect.setAttribute("rx", child.getAttribute("rx"));
                rect.setAttribute("ry", child.getAttribute("ry"));
            }
            rect.setAttribute("width", childBBox.width);
            rect.setAttribute("height", childBBox.height);
            rect.setAttribute("fill", "black");
            mask.appendChild(rect);
        }

        // Mask out the line within the parent node (either packed or regular)
        if(!document.getElementById(parentId + "_clip"))
        {
            let rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
            rect.setAttribute("id", parentId + "_clip");
            rect.setAttribute("x", parentBBox.x - svgAreaBBox.x);
            rect.setAttribute("y", parentBBox.y - svgAreaBBox.y);
            if(parent.nodeName == "ellipse")
            {
                rect.setAttribute("rx", parent.getAttribute("rx"));
                rect.setAttribute("ry", parent.getAttribute("ry"));
            }
            rect.setAttribute("width", parentBBox.width);
            rect.setAttribute("height", parentBBox.height);
            rect.setAttribute("fill", "black");
            mask.appendChild(rect);
        }

        let path;
        if (!document.getElementById(lineId)) {
            // If it does not, render it by creating an SVG elipse with label as text
            path = document.createElementNS("http://www.w3.org/2000/svg", "path");
            path.setAttribute("id", lineId);
            path.setAttribute("mask", "url(#mask)");
            path.setAttribute("class", cssClass);
        }
        else {
            path = document.getElementById(lineId);
        }
       
        let childMiddleX = childBBox.x - svgAreaBBox.x + childBBox.width / 2;
        let childMiddleY = childBBox.y - svgAreaBBox.y + childBBox.height / 2;

        // Workaround, straight lines are not shown with the masking used.
        if(startX == childMiddleX) childMiddleX++;
        if(startY == childMiddleY) childMiddleY++;

        let points = [];
        points.push(["M"])
        points.push([startX, startY].join(" "));
        if(useCurve)
        {
            points.push(["C"]);
            let ratio = 0.5;
            let lineLength = Math.sqrt(Math.pow(childMiddleX - startX, 2) + Math.pow(childMiddleY - startY, 2));
            let bez1Length = lineLength * ratio;
            let bez1X = bez1Length * Math.cos(45) + startX;
            let bex1Y = bez1Length * Math.sin(45) + startY;
            points.push([bez1X, bex1Y].join(" "));

            let bez2X = bez1Length * Math.cos(-45) + childMiddleX;
            let bex2Y = bez1Length * Math.sin(-45) + childMiddleY;
            points.push([bez2X, bex2Y].join(" "));
        }

        points.push([childMiddleX, childMiddleY].join(" "));
        path.setAttribute("d", points.join(" "));

        svgArea.appendChild(path);
    }

    /* 
    * Create main mask, if it does not exist already, to be used to define the clipping area to erase the 
    * lines that would otherwise be drawn over the target node.
    */
    createMainMask() {
        let svgArea = document.getElementById(SVG_IMG_ID);
        let svgAreaBBox = svgArea.getBoundingClientRect();
        let defs;
        let mask;
        let rect;
        if (!document.getElementById("mainDefs")) {
            defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
            defs.setAttribute("id", "mainDefs");

            mask = document.createElementNS("http://www.w3.org/2000/svg", "mask");
            mask.setAttribute("id", "mask");
            mask.setAttribute("width", svgAreaBBox.width);
            mask.setAttribute("height", svgAreaBBox.height);

            rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
            rect.setAttribute("width", svgAreaBBox.width);
            rect.setAttribute("height", svgAreaBBox.height);
            rect.setAttribute("fill", "white");

            svgArea.appendChild(defs);
            defs.appendChild(mask);
            mask.appendChild(rect);
        }

        else {
            defs = document.getElementById("mainDefs");
            mask = document.getElementById("mask");
        }
        return mask;
    }

    prefixTreeAreaIdToNodeId(nodeId)
    {
        return this._id + "_" + nodeId;
    }
}
