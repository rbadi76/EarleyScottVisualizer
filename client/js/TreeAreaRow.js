class TreeAreaRow {
    constructor() {
        this._treeAreas = [];
        this._width = 0;
    }

    addTreeArea(treeArea) {
        this._treeAreas.push(treeArea);
    }

    get height() {
        let maxHeight = 0;
        this._treeAreas.forEach(treeArea => {
            let height = treeArea.height;
            if (maxHeight < height)
                maxHeight = height;
        });
        return maxHeight;
    }

    get treeCount() {
        return this._treeAreas.length;
    }

    set width(newWidth) {
        this._width = newWidth;
    }

    get availableWidth() {
        let usedSpace = 0;
        this._treeAreas.forEach(treeArea => {
            usedSpace += treeArea.width;
        });
        return this._width - usedSpace;
    }

    render(x, y, width) {
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
