import RevenueCard from "../../components/ecommerce/RevenueCard";
import InventoryAnalytics from "../../components/inventory/InventoryAnalytics";
import PageMeta from "../../components/common/PageMeta";

export default function Home() {
  return (
    <>
      <PageMeta
        title="Inventory and Sales Management | Haruki"
        description="Manage product inventory, daily sales, and purchase expenses."
      />
      <div className="grid grid-cols-12 gap-4 md:gap-6 space-y-6">
        {/* Revenue Overview Section */}
        <div className="col-span-12">
          <div className="mb-2">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Revenue Overview
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Track your total revenue, order count, and average order value
            </p>
          </div>
          <RevenueCard />
        </div>

        <div className="col-span-12">
          <InventoryAnalytics />
        </div>

      </div>
    </>
  );
}
