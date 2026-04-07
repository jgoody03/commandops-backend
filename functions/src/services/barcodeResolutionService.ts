import { scanEventsCol, Timestamp } from "../core/firestore";
import { ProductRepo } from "../repositories/productRepo";
import { BarcodeRepo } from "../repositories/barcodeRepo";
import { normalizeBarcode } from "../utils/normalizeBarcode";

export class BarcodeResolutionService {
  private productRepo = new ProductRepo();
  private barcodeRepo = new BarcodeRepo();

  async resolve(params: {
    workspaceId: string;
    code: string;
    uid: string;
    deviceId?: string;
    symbology?: string;
  }) {
    const normalizedCode = normalizeBarcode(params.code);

    const barcodeHit = await this.barcodeRepo.resolve(
      params.workspaceId,
      normalizedCode
    );

    let result:
      | {
          resolutionStatus: "resolved";
          productId: string;
          sku: string;
          productName: string;
          price?: number | null;
        }
      | {
          resolutionStatus: "unresolved";
        };

    if (barcodeHit) {
      const product = await this.productRepo.getById(
        params.workspaceId,
        String(barcodeHit.productId)
      );

      result = {
        resolutionStatus: "resolved",
        productId: String(barcodeHit.productId),
        sku: product.sku,
        productName: product.name,
        price: product.price ?? null,
      };
    } else {
      result = { resolutionStatus: "unresolved" };
    }

    await scanEventsCol(params.workspaceId).add({
      code: params.code,
      normalizedCode,
      symbology: params.symbology ?? null,
      deviceId: params.deviceId ?? null,
      scannedBy: params.uid,
      scannedAt: Timestamp.now(),
      ...result,
    });

    return result;
  }
}