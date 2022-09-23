class TreeArea {
    constructor(arrayOfSets) {
        this._width = 0;
        this._height = 0;
        this._arrayOfSets = arrayOfSets;
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
        let svgImgArea = document.getElementById("svgImgArea");
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
                node.renderNode(nodePosX + NODE_MARGIN_LR, nodeYPos);
                nodePosX = nodePosX + node.width + NODE_MARGIN_LR * 2;
            }

            startY = startY + maxNodeHeight + NODE_MARGIN_TB + NODE_ROW_MARGIN_TB;
            rowIdx++;
        });

        // We must iterate again through the sets as we cannot draw the lines and packed nodes until all the nodes have been drawn.
        rowIdx = 0;
        this._arrayOfSets.forEach(set => {
            // x is now the top left corner of the area.
            // Calculate the position of the first node in the row
            //nodePosX = x + (this.width - this.getWidthForAllNodes(set)) / 2;
            maxNodeHeight = this.getMaxNodeHeight(set, rowIdx);

            iterator = set.values();
            for(const key of iterator)
            {
                let node = getNodeFromKey(key, rowIdx, this._arrayOfSets);
                let nodeYPos = document.getElementById(node.getSanitizedHtmlId()).getBoundingClientRect().y 
                    - document.getElementById("svgImgArea").getBoundingClientRect().y + (maxNodeHeight - node.height) / 2;
                if(node.familiesCount > 1)
                {
                    let nodeAreaStartX = document.getElementById(node.getSanitizedHtmlId()).getBoundingClientRect().x - document.getElementById("svgImgArea").getBoundingClientRect().x - NODE_MARGIN_LR;
                    let nodeAreaSegmentSizeX = (node.width + (NODE_MARGIN_LR * 2)) / (node.familiesCount * 2) - PACKED_NODE_R;
                    let packedNodeX = nodeAreaStartX + nodeAreaSegmentSizeX;
                    let packedNodeY = nodeYPos + node.height + NODE_MARGIN_TB + NODE_ROW_MARGIN_TB - PACKED_NODE_R;
                    let counter = 1;
                    for(let [key, value] of node.families)
                    {
                        this.renderPackedNode(packedNodeX, packedNodeY, PACKED_NODE_R, node.getSanitizedHtmlId() + "_f" + counter);
                        // Draw line from packed node to child/children
                        if(value instanceof BinaryFamily)
                        {
                            this.renderPath(packedNodeX + PACKED_NODE_R, packedNodeY + PACKED_NODE_R, node.getSanitizedHtmlId() + "_line_" + counter, value.node2.getSanitizedHtmlId()); 
                        }
                        this.renderPath(packedNodeX + PACKED_NODE_R, packedNodeY + PACKED_NODE_R, node.getSanitizedHtmlId() + "_line_" + counter, value.node.getSanitizedHtmlId());

                        // Update for next iteration
                        packedNodeX += nodeAreaSegmentSizeX * 2 + 2 * PACKED_NODE_R;
                        counter++;
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
        let svgArea = document.getElementById("svgImgArea");

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

    renderPath(startX, startY, id, childId)
    {

        /*
        * Finally figured out how to mask out the lines thanks to this article.
        * https://stackoverflow.com/questions/11404391/invert-svg-clip-show-only-outside-path
        */

        let svgArea = document.getElementById("svgImgArea");
        let child = document.getElementById(childId);
        let childBBox = child.getBoundingClientRect();
        let svgAreaBBox = svgArea.getBoundingClientRect(); // Use to deduct x and y values as x2 and y2 attributes start at top left of SVG image, the main page. 

        // First make sure to define the clipping area to erase the lines that would otherwise be drawn over the target node.
        let defs;
        let mask;
        let rect;
        if(!document.getElementById("mainDefs"))
        {
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
        else
        {
            defs = document.getElementById("mainDefs");
            mask = document.getElementById("mask");
        }
        if(!document.getElementById(childId + "_clip"))
        {
            let rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
            rect.setAttribute("id", childId + "_clip");
            rect.setAttribute("x", childBBox.x - svgAreaBBox.x);
            rect.setAttribute("y", childBBox.y - svgAreaBBox.y);
            rect.setAttribute("rx", child.getAttribute("rx"));
            rect.setAttribute("ry", child.getAttribute("ry"));
            rect.setAttribute("width", childBBox.width);
            rect.setAttribute("height", childBBox.height);
            rect.setAttribute("fill", "black");
            mask.appendChild(rect);
        }

        let path;
        if (!document.getElementById(id)) {
            // If it does not, render it by creating an SVG elipse with label as text
            path = document.createElementNS("http://www.w3.org/2000/svg", "path");
            path.setAttribute("id", id);
            path.setAttribute("mask", "url(#mask)");
        }
        else {
            path = document.getElementById(id);
        }
       
        let childMiddleX = childBBox.x - svgAreaBBox.x + childBBox.width / 2;
        let childMiddleY = childBBox.y - svgAreaBBox.y + childBBox.height / 2;

        let points = [];
        points.push(["M"])
        points.push([startX, startY].join(" "));
        points.push([childMiddleX, childMiddleY].join(" "));
        path.setAttribute("d", points.join(" "));

        svgArea.appendChild(path);
    }
}
