import React, { useEffect, useState } from "react";
import { collection, getDocs, updateDoc, doc } from "firebase/firestore";
import { db } from "../../../Firebase";

interface OrderItem {
  product: string;
  qty: number;
  price: number;
  paymentMode: string;
  total: number;
  customerName: string;
  label: string;
}

interface Order {
  id: string;
  items: OrderItem[];
  grandTotal: number;
  status?: string;
  createdAt: any;
}

const UnpaidOrdersTable: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);

  const fetchUnpaidOrders = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "orders"));
      const ordersData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Order[];

      const unpaidOrders = ordersData.filter((order) =>
        order.items.some((item) => item.paymentMode === "not-paid")
      );

      setOrders(unpaidOrders);
    } catch (error) {
      console.error("Error fetching unpaid orders:", error);
    }
  };

  useEffect(() => {
    const load = async () => {
      await fetchUnpaidOrders();
      setLoading(false);
    };

    load();
  }, []);

  const markOrderPaid = async (order: Order) => {
    setUpdatingOrderId(order.id);
    try {
      const updatedItems = order.items.map((item) =>
        item.paymentMode === "not-paid"
          ? { ...item, paymentMode: "paid" }
          : item
      );

      await updateDoc(doc(db, "orders", order.id), {
        items: updatedItems,
      });

      await fetchUnpaidOrders();
    } catch (error) {
      console.error("Error updating order payment status:", error);
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const formatDate = (timestamp: any) => {
    if (timestamp?.toDate) {
      return timestamp.toDate().toLocaleDateString();
    }
    return "N/A";
  };

  const getCustomerName = (order: Order) => {
    const name = order.items
      .map((item) => item.customerName)
      .filter(Boolean)[0];
    return name || "Unknown";
  };

  const getItemsSummary = (items: OrderItem[]) => {
    return items
      .map((item) => `${item.label} x${item.qty}`)
      .join(", ");
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
        Loading unpaid orders...
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
      <div className="mb-5">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
          Unpaid Orders
        </h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Orders with at least one unpaid item.
        </p>
      </div>

      {orders.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
          No unpaid orders found.
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
                  Date
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {orders.map((order) => (
                <tr key={order.id}>
                  <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-200">
                    {getCustomerName(order)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-200">
                    {getItemsSummary(order.items)}
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">
                    ₹{order.grandTotal}
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-gray-500 dark:text-gray-400">
                    {formatDate(order.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => markOrderPaid(order)}
                      disabled={updatingOrderId === order.id}
                      className="inline-flex items-center rounded-lg bg-brand-500 px-3 py-2 text-xs font-medium text-white transition hover:bg-brand-600 disabled:opacity-50"
                    >
                      {updatingOrderId === order.id ? "Updating..." : "Mark Paid"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default UnpaidOrdersTable;
