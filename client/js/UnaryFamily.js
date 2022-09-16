class UnaryFamily {
    constructor(node) {
        this._node = node;
    }

    get node() {
        return this._node;
    }

    getKey() {
        return this._node.toString();
    }
}
