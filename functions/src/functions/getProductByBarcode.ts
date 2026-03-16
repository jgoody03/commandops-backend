import { onCall, HttpsError } from "firebase-functions/v2/https";
import { assertWorkspaceMembership } from "../core/auth";
import { barcodeIndexCol, productsCol } from "../core/firestore";

interface BarcodeIndexDoc {
  barcode: string;
  productId: string;
  createdAt?: FirebaseFirestore.Timestamp;
  updatedAt?: FirebaseFirestore.Timestamp;
}

interface ProductDoc {
  sku: string;
  name: string;
  description?: string;
  primaryBarcode?: string | null;
  barcodeAliases?: string[];
  unit?: string;
  isActive?: boolean;
  createdAt?: FirebaseFirestore.Timestamp;
  updatedAt?: FirebaseFirestore.Timestamp;
}

interface GetProductByBarcodeResponse {
  found: boolean;
  product: {
    id: string;
    sku: string;
    name: string;
    description?: string;
    primaryBarcode?: string | null;
    barcodeAliases?: string[];
    unit?: string;
    isActive?: boolean;
  } | null;
}

function requireAuth(uid?: string): string {
  if (!uid) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }

  return uid;
}

function parseRequiredString(value: unknown, fieldName: string): string {
  const parsed = String(value ?? "").trim();

  if (!parsed) {
    throw new HttpsError("invalid-argument", `${fieldName} is required.`);
  }

  return parsed;
}

export const getProductByBarcode = onCall(
  async (request): Promise<GetProductByBarcodeResponse> => {
    const uid = requireAuth(request.auth?.uid);

    const workspaceId = parseRequiredString(
      request.data?.workspaceId,
      "workspaceId"
    );
    const barcode = parseRequiredString(request.data?.barcode, "barcode");

    await assertWorkspaceMembership(workspaceId, uid);

    const barcodeRef = barcodeIndexCol(workspaceId).doc(barcode);
    const barcodeSnap = await barcodeRef.get();

    if (!barcodeSnap.exists) {
      return {
        found: false,
        product: null,
      };
    }

    const barcodeData = barcodeSnap.data() as BarcodeIndexDoc;
    const productId = String(barcodeData.productId || "").trim();

    if (!productId) {
      throw new HttpsError(
        "data-loss",
        `Barcode index entry ${barcode} is missing productId.`
      );
    }

    const productRef = productsCol(workspaceId).doc(productId);
    const productSnap = await productRef.get();

    if (!productSnap.exists) {
      throw new HttpsError(
        "not-found",
        `Product ${productId} referenced by barcode ${barcode} was not found.`
      );
    }

    const product = productSnap.data() as ProductDoc;

    return {
      found: true,
      product: {
        id: productSnap.id,
        sku: product.sku,
        name: product.name,
        description: product.description,
        primaryBarcode: product.primaryBarcode ?? null,
        barcodeAliases: Array.isArray(product.barcodeAliases)
          ? product.barcodeAliases
          : [],
        unit: product.unit,
        isActive: product.isActive,
      },
    };
  }
);