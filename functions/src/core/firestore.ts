import { initializeApp } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";

initializeApp();

export const db = getFirestore();
export { Timestamp };

export function workspaceRef(workspaceId: string) {
  return db.collection("workspaces").doc(workspaceId);
}

export function membersCol(workspaceId: string) {
  return workspaceRef(workspaceId).collection("members");
}

export function userRef(uid: string) {
  return db.collection("users").doc(uid);
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