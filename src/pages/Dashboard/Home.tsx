import OrdersAnalyticsChart from "../../components/ecommerce/OrdersAnalyticsChart";
import RevenueCard from "../../components/ecommerce/RevenueCard";
import TopSellingProducts from "../../components/ecommerce/TopSellingProducts";
import PaymentMethodAnalytics from "../../components/ecommerce/PaymentMethodAnalytics";
import PageMeta from "../../components/common/PageMeta";

export default function Home() {
  return (
    <>
      <PageMeta
        title="React.js Ecommerce Dashboard | TailAdmin - React.js Admin Dashboard Template"
        description="This is React.js Ecommerce Dashboard page for TailAdmin - React.js Tailwind CSS Admin Dashboard Template"
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

        {/* Orders Analytics Chart */}
        <div className="col-span-12">
          <div className="mb-2">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Orders Analytics
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              View order trends by daily, weekly, or monthly intervals
            </p>
          </div>
          <OrdersAnalyticsChart />
        </div>

        {/* Top Selling Products Section */}
        <div className="col-span-12 lg:col-span-8">
          <div className="mb-2">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Best Performers
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Top 10 most selling products with revenue details
            </p>
          </div>
          <TopSellingProducts />
        </div>

        {/* Payment Method Analytics Section */}
        <div className="col-span-12 lg:col-span-4">
          <div className="mb-2">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Payment Insights
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Payment method distribution and preferences
            </p>
          </div>
          <PaymentMethodAnalytics />
        </div>
      </div>
    </>
  );
}
