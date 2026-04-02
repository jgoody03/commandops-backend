"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Timestamp = exports.db = void 0;
exports.workspaceRef = workspaceRef;
exports.membersCol = membersCol;
exports.userRef = userRef;
exports.locationsCol = locationsCol;
exports.productsCol = productsCol;
exports.barcodeIndexCol = barcodeIndexCol;
exports.balancesCol = balancesCol;
exports.transactionsCol = transactionsCol;
exports.scanEventsCol = scanEventsCol;
exports.productInventorySummaryCol = productInventorySummaryCol;
exports.locationInventorySummaryCol = locationInventorySummaryCol;
exports.recentActivityCol = recentActivityCol;
exports.vendorsCol = vendorsCol;
const app_1 = require("firebase-admin/app");
const firestore_1 = require("firebase-admin/firestore");
Object.defineProperty(exports, "Timestamp", { enumerable: true, get: function () { return firestore_1.Timestamp; } });
(0, app_1.initializeApp)();
exports.db = (0, firestore_1.getFirestore)();
function workspaceRef(workspaceId) {
    return exports.db.collection("workspaces").doc(workspaceId);
}
function membersCol(workspaceId) {
    return workspaceRef(workspaceId).collection("members");
}
function userRef(uid) {
    return exports.db.collection("users").doc(uid);
}
function locationsCol(workspaceId) {
    return workspaceRef(workspaceId).collection("locations");
}
function productsCol(workspaceId) {
    return workspaceRef(workspaceId).collection("products");
}
function barcodeIndexCol(workspaceId) {
    return workspaceRef(workspaceId).collection("barcodeIndex");
}
function balancesCol(workspaceId) {
    return workspaceRef(workspaceId).collection("inventoryBalances");
}
function transactionsCol(workspaceId) {
    return workspaceRef(workspaceId).collection("inventoryTransactions");
}
function scanEventsCol(workspaceId) {
    return workspaceRef(workspaceId).collection("scanEvents");
}
function productInventorySummaryCol(workspaceId) {
    return workspaceRef(workspaceId).collection("productInventorySummary");
}
function locationInventorySummaryCol(workspaceId) {
    return workspaceRef(workspaceId).collection("locationInventorySummary");
}
function recentActivityCol(workspaceId) {
    return workspaceRef(workspaceId).collection("recentActivity");
}
function vendorsCol(workspaceId) {
    return workspaceRef(workspaceId).collection("vendors");
}
//# sourceMappingURL=firestore.js.map