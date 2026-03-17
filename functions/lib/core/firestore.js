"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Timestamp = exports.FieldValue = exports.db = void 0;
exports.workspaceRef = workspaceRef;
exports.membersCol = membersCol;
exports.locationsCol = locationsCol;
exports.productsCol = productsCol;
exports.barcodeIndexCol = barcodeIndexCol;
exports.balancesCol = balancesCol;
exports.transactionsCol = transactionsCol;
exports.scanEventsCol = scanEventsCol;
exports.productInventorySummaryCol = productInventorySummaryCol;
exports.locationInventorySummaryCol = locationInventorySummaryCol;
exports.recentActivityCol = recentActivityCol;
const firebase_admin_1 = __importDefault(require("firebase-admin"));
if (!firebase_admin_1.default.apps.length) {
    firebase_admin_1.default.initializeApp();
}
exports.db = firebase_admin_1.default.firestore();
exports.FieldValue = firebase_admin_1.default.firestore.FieldValue;
exports.Timestamp = firebase_admin_1.default.firestore.Timestamp;
function workspaceRef(workspaceId) {
    return exports.db.collection("workspaces").doc(workspaceId);
}
function membersCol(workspaceId) {
    return workspaceRef(workspaceId).collection("members");
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
//# sourceMappingURL=firestore.js.map