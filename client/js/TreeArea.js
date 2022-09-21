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
        this._arrayOfSets.forEach(set => {
            // Find the available space for each row
            let maxNodeHeight = 0;
            let iterator = set.values();
            let widthForAllNodesInTheRow = 0;
            for (const itsKey of iterator) {
                let node = getNodeFromKey(itsKey, rowIdx, this._arrayOfSets);
                if (node.height > maxNodeHeight)
                    maxNodeHeight = node.height;
                let nodeWidth = helperGetNodeWidth(itsKey) + (NODE_MARGIN_LR * 2);
                widthForAllNodesInTheRow += nodeWidth;
            }

            // Now we can position and render the nodes
            iterator = set.values();

            // x is now the top left corner of the area.
            // Calculate the position of the first node in the row
            let nodePosX = x + (this.width - widthForAllNodesInTheRow) / 2;
            y = y + NODE_MARGIN_TB + NODE_ROW_MARGIN_TB;

            for (const itsKey of iterator) {
                let node = getNodeFromKey(itsKey, rowIdx, this._arrayOfSets);
                let nodeYPos = y + (maxNodeHeight - node.height) / 2;
                node.renderNode(nodePosX + NODE_MARGIN_LR, nodeYPos);

                // Draw packed nodes and lines
                if(node.familiesCount > 1)
                {
                    let nodeAreaStartX = nodePosX; // - NODE_MARGIN_LR;
                    let nodeAreaSegmentSizeX = (node.width + (NODE_MARGIN_LR * 2)) / (node.familiesCount * 2) - PACKED_NODE_R;
                    let packedNodeX = nodeAreaStartX + nodeAreaSegmentSizeX;
                    let packedNodeY = nodeYPos + node.height + NODE_MARGIN_TB + NODE_ROW_MARGIN_TB - PACKED_NODE_R;
                    for(let i = 0; i < node.familiesCount; i++)
                    {
                        this.renderPackedNode(packedNodeX, packedNodeY, PACKED_NODE_R, node.toString() + "_f" + i + 1)
                        packedNodeX += nodeAreaSegmentSizeX * 2 + 2 * PACKED_NODE_R;
                    }
                }

                nodePosX = nodePosX + node.width + NODE_MARGIN_LR * 2;
            }

            y = y + maxNodeHeight + NODE_MARGIN_TB + NODE_ROW_MARGIN_TB;
            rowIdx++;
        });
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
            circle = document.getElementById(newId);
        }

        circle.setAttribute("cx", x + r);
        circle.setAttribute("cy", y + r);
        circle.setAttribute("r", r);
    }
}
