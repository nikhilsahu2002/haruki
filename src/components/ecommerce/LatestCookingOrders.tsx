import React, { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  query,
  where,
  updateDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../../../Firebase";

interface OrderItem {
  customerName: string;
  product: string;
  label: string;
  qty: number;
  price: number;
  paymentMode: string;
  total: number;
  variant?: {
    flavor: string;
    size: string;
  } | null;
}

interface Order {
  id: string;
  items: OrderItem[];
  grandTotal: number;
  status?: string;
  createdAt: any;
}

const LatestCookingOrders: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  const markAsCooked = async (orderId: string) => {
    setUpdating(orderId);
    try {
      await updateDoc(doc(db, "orders", orderId), {
        status: "completed",
        completedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error("Error marking order completed:", error);
    } finally {
      setUpdating(null);
    }
  };

  useEffect(() => {
    setLoading(true);
    const ordersQuery = query(
      collection(db, "orders"),
      where("status", "==", "cooking")
    );

    const unsubscribe = onSnapshot(
      ordersQuery,
      (snapshot) => {
        const ordersData = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        })) as Order[];
        setOrders(ordersData);
        setLoading(false);
      },
      (error) => {
        console.error("Error listening for cooking orders:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            Latest Cooking Orders
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Orders are sent here as cooking. Mark each one completed when ready.
          </p>
        </div>
      </div>

      {loading ? (
        <div>Loading cooking orders...</div>
      ) : orders.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
          No cooking orders available right now.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead>
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Customer
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Items
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Total
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {orders.map((order) => {
                const uniqueNames = Array.from(
                  new Set(order.items.map((item) => item.customerName).filter(Boolean))
                ).join(", ");
                const itemSummary = order.items
                  .map((item) => `${item.label} x${item.qty}`)
                  .join(" · ");

                return (
                  <tr key={order.id}>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-200">
                      {uniqueNames || "Unknown"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-200">
                      {itemSummary}
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">
                      ₹{order.grandTotal}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => markAsCooked(order.id)}
                        disabled={updating === order.id}
                        className="inline-flex items-center rounded-lg bg-brand-500 px-3 py-2 text-sm font-medium text-white transition hover:bg-brand-600 disabled:opacity-50"
                      >
                        {updating === order.id ? "Updating..." : "Mark Completed"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default LatestCookingOrders;
