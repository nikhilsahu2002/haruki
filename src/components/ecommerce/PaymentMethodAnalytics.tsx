import React, { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../../Firebase";
import Chart from "react-apexcharts";
import { ApexOptions } from "apexcharts";

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

interface PaymentStats {
  paid: number;
  notPaid: number;
}

const PaymentMethodAnalytics: React.FC = () => {
  const [paymentStats, setPaymentStats] = useState<PaymentStats>({
    paid: 0,
    notPaid: 0,
  });
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

        // Count payment status only for completed orders
        const stats: PaymentStats = {
          paid: 0,
          notPaid: 0,
        };

        completedOrders.forEach((order) => {
          order.items.forEach((item) => {
            if (item.paymentMode === "paid" || item.paymentMode === "cash" || item.paymentMode === "upi") {
              stats.paid += 1;
            } else if (item.paymentMode === "not-paid") {
              stats.notPaid += 1;
            }
          });
        });

        setPaymentStats(stats);
      } catch (error) {
        console.error("Error fetching orders:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  const total = paymentStats.paid + paymentStats.notPaid;
  const paidPercentage = total > 0 ? ((paymentStats.paid / total) * 100).toFixed(1) : 0;
  const notPaidPercentage = total > 0 ? ((paymentStats.notPaid / total) * 100).toFixed(1) : 0;

  const options: ApexOptions = {
    colors: ["#10B981", "#465FFF"],
    labels: ["Paid", "Not Paid"],
    chart: {
      fontFamily: "Outfit, sans-serif",
      toolbar: {
        show: false,
      },
      sparkline: {
        enabled: false,
      },
    },
    plotOptions: {
      pie: {
        donut: {
          size: "65%",
          labels: {
            show: true,
            name: {
              show: true,
              fontSize: "14px",
              fontFamily: "Outfit",
            },
            value: {
              show: true,
              fontSize: "18px",
              fontFamily: "Outfit",
              fontWeight: 600,
            },
            total: {
              show: true,
              label: "Total Orders",
              fontSize: "12px",
              fontFamily: "Outfit",
            },
          },
        },
      },
    },
    stroke: {
      show: true,
      width: 2,
      colors: ["transparent"],
    },
    dataLabels: {
      enabled: true,
      distributed: true,
      style: {
        fontSize: "12px",
        fontFamily: "Outfit",
      },
    },
    legend: {
      show: true,
      position: "bottom",
      horizontalAlign: "center",
      fontFamily: "Outfit",
      fontSize: "13px",
    },
    tooltip: {
      theme: "light",
      y: {
        formatter: function (value) {
          return value + " orders";
        },
      },
    },
  };

  if (loading) {
    return <div>Loading payment data...</div>;
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
          Payment Status Distribution
        </h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Orders by paid or not paid status
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="flex items-center justify-center">
          <div className="w-full">
            <Chart
              type="donut"
              series={[paymentStats.paid, paymentStats.notPaid]}
              options={options}
              height={300}
            />
          </div>
        </div>

        <div className="flex flex-col justify-center gap-4">
          {/* Paid Orders */}
          <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
            <div className="mb-2 flex items-center gap-2">
              <span className="inline-flex h-3 w-3 rounded-full bg-green-500"></span>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Paid Orders
              </span>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {paymentStats.paid}
            </p>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {paidPercentage}% of total orders
            </p>
            <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
              <div
                className="h-full bg-green-500"
                style={{ width: `${paidPercentage}%` }}
              ></div>
            </div>
          </div>

          {/* Not Paid Orders */}
          <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
            <div className="mb-2 flex items-center gap-2">
              <span className="inline-flex h-3 w-3 rounded-full bg-blue-500"></span>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Not Paid Orders
              </span>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {paymentStats.notPaid}
            </p>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {notPaidPercentage}% of total orders
            </p>
            <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
              <div
                className="h-full bg-blue-500"
                style={{ width: `${notPaidPercentage}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentMethodAnalytics;
