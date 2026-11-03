import ComponentCard from "../../components/common/ComponentCard";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import InventoryManager from "../../components/inventory/InventoryManager";

export default function Inventory() {
  return (
    <>
      <PageMeta
        title="Inventory Management | Haruki"
        description="Manage product units, costs, stock purchases, and expenses."
      />
      <PageBreadcrumb pageTitle="Inventory" />
      <div className="space-y-6">
        <ComponentCard title="Products and stock purchases">
          <InventoryManager />
        </ComponentCard>
      </div>
    </>
  );
}
