import admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp();
}

export const db = admin.firestore();
export const FieldValue = admin.firestore.FieldValue;
export const Timestamp = admin.firestore.Timestamp;

export function workspaceRef(workspaceId: string) {
  return db.collection("workspaces").doc(workspaceId);
}

export function membersCol(workspaceId: string) {
  return workspaceRef(workspaceId).collection("members");
}

export function locationsCol(workspaceId: string) {
  return workspaceRef(workspaceId).collection("locations");
}

export function productsCol(workspaceId: string) {
  return workspaceRef(workspaceId).collection("products");
}

export function barcodeIndexCol(workspaceId: string) {
  return workspaceRef(workspaceId).collection("barcodeIndex");
}

export function balancesCol(workspaceId: string) {
  return workspaceRef(workspaceId).collection("inventoryBalances");
}

export function transactionsCol(workspaceId: string) {
  return workspaceRef(workspaceId).collection("inventoryTransactions");
}

export function scanEventsCol(workspaceId: string) {
  return workspaceRef(workspaceId).collection("scanEvents");
}

export function productInventorySummaryCol(workspaceId: string) {
  return workspaceRef(workspaceId).collection("productInventorySummary");
}

export function locationInventorySummaryCol(workspaceId: string) {
  return workspaceRef(workspaceId).collection("locationInventorySummary");
}

export function recentActivityCol(workspaceId: string) {
  return workspaceRef(workspaceId).collection("recentActivity");
}