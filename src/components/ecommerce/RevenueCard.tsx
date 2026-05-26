import React, { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../../Firebase";

interface OrderItem {
  product: string;
  qty: number;
  price: number;
  paymentMode: string;
  total: number;
}

interface Order {
  id: string;
  items: OrderItem[];
  grandTotal: number;
  createdAt: any;
  status?: string;
}

const RevenueCard: React.FC = () => {
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalOrders, setTotalOrders] = useState(0);
  const [avgOrderValue, setAvgOrderValue] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "orders"));
        const ordersData = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Order[];

        const completedOrders = ordersData.filter((order) => order.status === "completed");

        // Calculate total revenue only for completed orders
        const revenue = completedOrders.reduce((sum, order) => sum + order.grandTotal, 0);

        // Calculate average order value only for completed orders
        const avgValue = completedOrders.length > 0 ? revenue / completedOrders.length : 0;

        setTotalRevenue(revenue);
        setTotalOrders(completedOrders.length);
        setAvgOrderValue(avgValue);
      } catch (error) {
        console.error("Error fetching orders:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  if (loading) {
    return <div>Loading revenue data...</div>;
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {/* Total Revenue Card */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Total Revenue
            </h4>
            <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
              ₹{totalRevenue.toLocaleString("en-IN")}
            </p>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Total income from all orders
            </p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-500/10">
            <span className="text-2xl">💰</span>
          </div>
        </div>
      </div>

      {/* Total Orders Card */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Total Orders
            </h4>
            <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
              {totalOrders}
            </p>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Number of orders placed
            </p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-500/10">
            <span className="text-2xl">📦</span>
          </div>
        </div>
      </div>

      {/* Average Order Value Card */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Average Order Value
            </h4>
            <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
              ₹{avgOrderValue.toFixed(2)}
            </p>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Average per order
            </p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10">
            <span className="text-2xl">📊</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RevenueCard;
