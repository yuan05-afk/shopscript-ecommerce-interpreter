import type { InventoryProduct } from "../inventory-data";
import type { CouponEntry } from "../coupon-data";
import type { NotificationType } from "./notification-center";
import { CouponsPage } from "./coupons-page";
import { InventoryPage as ProductInventoryPage } from "./inventory-manager";
import "../inventory.css";

interface InventoryHubProps {
  view: "products" | "coupons";
  onViewChange: (view: "products" | "coupons") => void;
  products: InventoryProduct[];
  onSave: (product: InventoryProduct) => void;
  onDelete: (id: string) => void;
  onReset: () => void;
  onNotify: (type: NotificationType, title: string, message: string) => void;
  coupons: CouponEntry[];
  onSaveCoupon: (coupon: CouponEntry) => void;
  onDeleteCoupon: (id: string) => void;
  onResetCoupons: () => void;
  productSearch?: string;
  couponSearch?: string;
}

export function InventoryPage({
  view,
  onViewChange,
  products,
  onSave,
  onDelete,
  onReset,
  onNotify,
  coupons,
  onSaveCoupon,
  onDeleteCoupon,
  onResetCoupons,
  productSearch = "",
  couponSearch = "",
}: InventoryHubProps) {
  if (view === "coupons") {
    return (
      <CouponsPage
        coupons={coupons}
        onSave={onSaveCoupon}
        onDelete={onDeleteCoupon}
        onReset={onResetCoupons}
        onNotify={onNotify}
        onBackToInventory={() => onViewChange("products")}
        initialSearch={couponSearch}
      />
    );
  }

  return (
    <ProductInventoryPage
      products={products}
      onSave={onSave}
      onDelete={onDelete}
      onReset={onReset}
      onNotify={onNotify}
      onOpenCoupons={() => onViewChange("coupons")}
      initialSearch={productSearch}
    />
  );
}