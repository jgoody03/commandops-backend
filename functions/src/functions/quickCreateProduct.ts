import { onCall, HttpsError } from "firebase-functions/v2/https";
import { assertWorkspaceMembership } from "../core/auth";
import { ProductRepo } from "../repositories/productRepo";
import { BarcodeRepo } from "../repositories/barcodeRepo";

const productRepo = new ProductRepo();
const barcodeRepo = new BarcodeRepo();

export const quickCreateProduct = onCall(async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }

  const workspaceId = String(request.data.workspaceId || "").trim();
  const sku = String(request.data.sku || "").trim();
  const name = String(request.data.name || "").trim();
  const primaryBarcode = request.data.primaryBarcode
    ? String(request.data.primaryBarcode).trim()
    : null;

  if (!workspaceId || !sku || !name) {
    throw new HttpsError("invalid-argument", "workspaceId, sku, and name are required.");
  }

  await assertWorkspaceMembership(workspaceId, request.auth.uid);

  const product = await productRepo.create(workspaceId, {
    sku,
    name,
    primaryBarcode,
    unit: "each",
  });

  if (primaryBarcode) {
    await barcodeRepo.upsert(workspaceId, primaryBarcode, product.id, product.sku);
  }

  return {
    ok: true,
    product,
  };
});