class BinaryFamily extends UnaryFamily {
    constructor(node1, node2) {
        super(node1);
        this._node2 = node2;
    }

    get node2() {
        return this._node2;
    }

    getKey() {
        return "(" + this._node.toString() + ", " + this._node2.toString() + ")";
    }

    getReverseKey() {
        "(" + this._node2.toString() + ", " + this._node.toString() + ")";
    }
}
