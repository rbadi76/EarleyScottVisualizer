class SPPFnode {
    constructor(label, i, j) {
        this._label = label;
        this._i = i;
        this._j = j;
        this._families = new Map();
    }

    addFamily(family) {
        if (family instanceof UnaryFamily || family instanceof BinaryFamily) {
            this._families.set(family.getKey(), family);
        }

        else {
            throw new Error("Family of a node can only bee of type UnaryFamily og BinaryFamily");
        }

    }

    familiesCount() {
        return this._families.size;
    }

    hasFamily(family) {
        if (family instanceof BinaryFamily) {
            if (this._families.has(family.getKey()) || this._families.has(family.getReverseKey()))
                return true;
            else
                return false;
        }

        else {
            if (this._families.has(family.getKey()))
                return true;
            else
                return false;
        }
    }

    hasChild(key) {
        if (this._families.size > 0) {
            let childFound = false;
            let iterator = this._families.values();
            for (const family of iterator) {
                if (family instanceof BinaryFamily) {
                    if (family.node2.toString() == key) {
                        return true;
                    }
                }
                if (family.node.toString() == key) {
                    return true;
                }
            }
            return false;
        }
    }

    getChild(key) {
        if (this._families.size > 0) {
            let childFound = false;
            let iterator = this._families.values();
            for (const family of iterator) {
                if (family instanceof BinaryFamily) {
                    if (family.node2.toString() == key) {
                        return family.node2;
                    }
                }
                if (family.node.toString() == key) {
                    return family.node;
                }
            }
        }
        return null;
    }

    // Is equal - meaning has the same label and start index and end index.
    isEqual(sppfNode) {
        if (sppfNode.label == this._label && sppfNode.i == this._i && sppfNode.j == this._j)
            return true;
        else
            return false;
    }

    // Is same meaning is equal and has the exact same families
    isSame(sppfNode) {
        if (sppfNode.isEqual(this)) {
            if (sppfNode.familiesCount != this.familiesCount) {
                return false;
            }

            else {
                let sameness = true;
                const mapIter = this._families.keys();
                for (let i = 0; i < this._families.size; i++) {
                    let temp = mapIter.next().value;
                    if (!sppfNode.hasFamily(temp)) {
                        sameness = false;
                        break;
                    }
                }
                return sameness;
            }
        }
        else
            return false;
    }

    renderNode(x, y) {
        let svgArea = document.getElementById("svgImgArea");

        let sanitizedLabel = this._label;
        if (this._label.indexOf("::=") > 0)
            sanitizedLabel = this.sanitizeLabel(this._label);
        let newId = sanitizedLabel + "_" + this._i + "_" + this._j;

        let newEllipse;
        let newEllipseLabelText;
        let newEllipseLabel;
        if (!document.getElementById(newId)) {
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

        else {
            newEllipse = document.getElementById(newId);
            newEllipseLabel = document.getElementById(newId + "_text");
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

    get label() {
        return this._label;
    }

    get i() {
        return this._i;
    }

    get j() {
        return this._j;
    }

    get families() {
        return this._families;
    }

    get height() {
        return helperGetNodeHeight(this.toString());
    }

    get width() {
        return helperGetNodeWidth(this.toString());
    }

    toString() {
        return "(" + this._label + ", " + this._i + ", " + this._j + ")";
    }
}
