"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeBarcode = normalizeBarcode;
function normalizeBarcode(value) {
    return value.trim().replace(/\s+/g, "").toUpperCase();
}
//# sourceMappingURL=normalizeBarcode.js.map