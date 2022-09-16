class SVG_area {
    constructor(maxWidth) {
        this._treeAreaRows = [];
        this._maxWidth = maxWidth;
    }

    addTreeAreaRow(treeAreaRow) {
        treeAreaRow.width = this._maxWidth - (SVG_AREA_PADDING_ALL * 2);
        this._treeAreaRows.push(treeAreaRow);
    }

    get lastTreeAreaRow() {
        return this._treeAreaRows[this._treeAreaRows.length - 1];
    }

    get treeAreaRows() {
        return this._treeAreaRows;
    }

    render() {
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
