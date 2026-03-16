"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.makeRequestId = makeRequestId;
function makeRequestId() {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
//# sourceMappingURL=makeRequestId.js.map