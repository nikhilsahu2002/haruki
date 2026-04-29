import React, { useState, useEffect } from "react";
import Chart from "react-apexcharts";
import { ApexOptions } from "apexcharts";
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
}

type TimeRange = "daily" | "weekly" | "monthly";

const OrdersAnalyticsChart: React.FC = () => {
  const [timeRange, setTimeRange] = useState<TimeRange>("daily");
  const [chartData, setChartData] = useState<{ categories: string[]; series: number[] }>({
    categories: [],
    series: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAndProcessOrders = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "orders"));
        const ordersData = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Order[];

        processOrdersData(ordersData, timeRange);
      } catch (error) {
        console.error("Error fetching orders:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAndProcessOrders();
  }, [timeRange]);

  const processOrdersData = (orders: Order[], range: TimeRange) => {
    const aggregatedData: { [key: string]: number } = {};

    orders.forEach((order) => {
      const date = order.createdAt?.toDate?.() || new Date();
      let key: string;

      if (range === "daily") {
        key = date.toLocaleDateString("en-US", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        });
      } else if (range === "weekly") {
        const startOfWeek = new Date(date);
        startOfWeek.setDate(date.getDate() - date.getDay());
        key = `Week of ${startOfWeek.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        })}`;
      } else {
        key = date.toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
        });
      }

      aggregatedData[key] = (aggregatedData[key] || 0) + 1;
    });

    const sortedEntries = Object.entries(aggregatedData).sort((a, b) => {
      const dateA = new Date(a[0]);
      const dateB = new Date(b[0]);
      return dateA.getTime() - dateB.getTime();
    });

    const categories = sortedEntries.map(([key]) => key);
    const series = sortedEntries.map(([, value]) => value);

    setChartData({
      categories: categories.length > 0 ? categories : ["No Data"],
      series: series.length > 0 ? series : [0],
    });
  };

  const options: ApexOptions = {
    colors: ["#465fff"],
    chart: {
      fontFamily: "Outfit, sans-serif",
      type: "bar",
      height: 350,
      toolbar: {
        show: false,
      },
    },
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: "45%",
        borderRadius: 5,
        borderRadiusApplication: "end",
      },
    },
    dataLabels: {
      enabled: true,
      style: {
        colors: ["#465fff"],
      },
    },
    stroke: {
      show: true,
      width: 2,
      colors: ["transparent"],
    },
    xaxis: {
      categories: chartData.categories,
      axisBorder: {
        show: false,
      },
      axisTicks: {
        show: false,
      },
    },
    legend: {
      show: true,
      position: "top",
      horizontalAlign: "left",
      fontFamily: "Outfit",
    },
    yaxis: {
      title: {
        text: "Number of Orders",
      },
    },
    grid: {
      yaxis: {
        lines: {
          show: true,
        },
      },
    },
    fill: {
      opacity: 1,
    },
    tooltip: {
      x: {
        format: "dd MMM yyyy",
      },
      y: {
        formatter: (value) => `${value} orders`,
      },
    },
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
        <div>Loading orders analytics...</div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            Orders Analytics
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Order count by {timeRange === "daily" ? "date" : timeRange === "weekly" ? "week" : "month"}
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setTimeRange("daily")}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              timeRange === "daily"
                ? "bg-brand-500 text-white"
                : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
            }`}
          >
            Daily
          </button>
          <button
            onClick={() => setTimeRange("weekly")}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              timeRange === "weekly"
                ? "bg-brand-500 text-white"
                : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
            }`}
          >
            Weekly
          </button>
          <button
            onClick={() => setTimeRange("monthly")}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              timeRange === "monthly"
                ? "bg-brand-500 text-white"
                : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
            }`}
          >
            Monthly
          </button>
        </div>
      </div>

      <Chart
        type="bar"
        series={[
          {
            name: "Orders",
            data: chartData.series,
          },
        ]}
        options={options}
        height={350}
      />
    </div>
  );
};

export default OrdersAnalyticsChart;
