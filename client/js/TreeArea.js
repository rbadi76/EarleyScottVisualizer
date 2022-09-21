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
                node.renderNode(nodePosX + NODE_MARGIN_LR, y + (maxNodeHeight - node.height) / 2);
                nodePosX = nodePosX + node.width + NODE_MARGIN_LR * 2;
            }

            y = y + maxNodeHeight + NODE_MARGIN_TB + NODE_ROW_MARGIN_TB;
            rowIdx++;
        });
    }
}
