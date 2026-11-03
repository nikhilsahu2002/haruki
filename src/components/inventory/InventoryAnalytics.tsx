import React, { useEffect, useMemo, useState } from "react";
import Chart from "react-apexcharts";
import type { ApexOptions } from "apexcharts";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../../../Firebase";

interface InventoryProduct {
  id: string;
  name: string;
}

interface InventoryTransaction {
  id: string;
  type: "purchase" | "sale";
  productName: string;
  unit: string;
  quantity: number;
  unitCost: number;
  total: number;
  date: string;
}

interface DailySale {
  id: string;
  date: string;
  total: number;
}

interface DailyValue {
  date: string;
  sales: number;
  expenses: number;
}

const fieldClassName =
  "h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 outline-none focus:border-brand-500 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90";

const toDateInputValue = (date: Date) => {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
};

const getMonthStart = () => {
  const today = new Date();
  return toDateInputValue(new Date(today.getFullYear(), today.getMonth(), 1));
};

const formatCurrency = (amount: number) =>
  `₹${amount.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const escapeCsvValue = (value: string | number) => {
  const text = String(value);
  const safeText = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return `"${safeText.replace(/"/g, '""')}"`;
};

const getDateRange = (from: string, to: string) => {
  const dates: string[] = [];
  const current = new Date(`${from}T00:00:00`);
  const end = new Date(`${to}T00:00:00`);
  while (current <= end) {
    dates.push(toDateInputValue(current));
    current.setDate(current.getDate() + 1);
  }
  return dates;
};

const InventoryAnalytics: React.FC = () => {
  const [products, setProducts] = useState<InventoryProduct[]>([]);
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [dailySales, setDailySales] = useState<DailySale[]>([]);
  const [fromDate, setFromDate] = useState(getMonthStart);
  const [toDate, setToDate] = useState(() => toDateInputValue(new Date()));
  const [productFilter, setProductFilter] = useState("all");
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingTransactions, setLoadingTransactions] = useState(true);
  const [loadingSales, setLoadingSales] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const unsubscribeProducts = onSnapshot(
      collection(db, "inventoryProducts"),
      (snapshot) => {
        setProducts(
          snapshot.docs.map((productDoc) => ({
            id: productDoc.id,
            name:
              typeof productDoc.data().name === "string"
                ? productDoc.data().name
                : "Unnamed product",
          }))
        );
        setLoadingProducts(false);
      },
      (snapshotError) => {
        console.error("Error loading analytics products:", snapshotError);
        setError("Unable to load products for inventory analytics.");
        setLoadingProducts(false);
      }
    );
    const unsubscribeTransactions = onSnapshot(
      collection(db, "inventoryTransactions"),
      (snapshot) => {
        const records = snapshot.docs.map(
          (transactionDoc) =>
            ({
              id: transactionDoc.id,
              ...transactionDoc.data(),
            }) as InventoryTransaction
        );
        setTransactions(
          records.filter(
            (record) =>
              (record.type === "purchase" || record.type === "sale") &&
              typeof record.date === "string"
          )
        );
        setLoadingTransactions(false);
      },
      (snapshotError) => {
        console.error("Error loading inventory analytics transactions:", snapshotError);
        setError("Unable to load inventory transactions.");
        setLoadingTransactions(false);
      }
    );
    const unsubscribeSales = onSnapshot(
      collection(db, "inventoryDailySales"),
      (snapshot) => {
        setDailySales(
          snapshot.docs.map((saleDoc) => {
            const data = saleDoc.data();
            return {
              id: saleDoc.id,
              date: typeof data.date === "string" ? data.date : saleDoc.id,
              total: Number(data.total) || 0,
            };
          })
        );
        setLoadingSales(false);
      },
      (snapshotError) => {
        console.error("Error loading daily sales analytics:", snapshotError);
        setError("Unable to load daily sales.");
        setLoadingSales(false);
      }
    );

    return () => {
      unsubscribeProducts();
      unsubscribeTransactions();
      unsubscribeSales();
    };
  }, []);

  const invalidDateRange = fromDate > toDate;
  const loading = loadingProducts || loadingTransactions || loadingSales;
  const filteredTransactions = useMemo(
    () =>
      transactions.filter(
        (transaction) =>
          transaction.date >= fromDate &&
          transaction.date <= toDate &&
          (productFilter === "all" ||
            (transaction.type === "purchase" &&
              transaction.productName === productFilter))
      ),
    [transactions, fromDate, toDate, productFilter]
  );
  const expenses = filteredTransactions
    .filter((transaction) => transaction.type === "purchase")
    .reduce((sum, transaction) => sum + (Number(transaction.total) || 0), 0);
  const salesFromTransactions = transactions
    .filter(
      (transaction) =>
        transaction.type === "sale" &&
        transaction.date >= fromDate &&
        transaction.date <= toDate
    )
    .reduce((sum, transaction) => sum + (Number(transaction.total) || 0), 0);
  const salesFromDailyEntries = dailySales
    .filter((sale) => sale.date >= fromDate && sale.date <= toDate)
    .reduce((sum, sale) => sum + sale.total, 0);
  const sales = salesFromTransactions + salesFromDailyEntries;
  const net = sales - expenses;
  const expenseTransactions = filteredTransactions
    .filter((transaction) => transaction.type === "purchase")
    .sort((left, right) => right.date.localeCompare(left.date));

  const chartDays = useMemo((): DailyValue[] => {
    if (invalidDateRange) return [];
    const days = getDateRange(fromDate, toDate);
    const totals = new Map<string, DailyValue>(
      days.map((date) => [date, { date, sales: 0, expenses: 0 }])
    );

    transactions.forEach((transaction) => {
      const day = totals.get(transaction.date);
      if (!day) return;
      if (transaction.type === "purchase") {
        if (
          productFilter !== "all" &&
          transaction.productName !== productFilter
        ) {
          return;
        }
        day.expenses += Number(transaction.total) || 0;
      } else {
        day.sales += Number(transaction.total) || 0;
      }
    });
    dailySales.forEach((sale) => {
      const day = totals.get(sale.date);
      if (day) day.sales += sale.total;
    });
    return Array.from(totals.values());
  }, [
    transactions,
    dailySales,
    fromDate,
    toDate,
    invalidDateRange,
    productFilter,
  ]);

  const productOptions = Array.from(
    new Set([
      ...products.map((product) => product.name),
      ...transactions
        .filter((transaction) => transaction.type === "purchase")
        .map((transaction) => transaction.productName)
        .filter(Boolean),
    ])
  ).sort((left, right) => left.localeCompare(right));

  const exportExpenses = () => {
    const rows = [
      ["Date", "Product", "Quantity", "Unit", "Unit cost (INR)", "Expense (INR)"],
      ...expenseTransactions.map((transaction) => [
        transaction.date,
        transaction.productName,
        Number(transaction.quantity) || 0,
        transaction.unit || "unit",
        Number(transaction.unitCost) || 0,
        Number(transaction.total) || 0,
      ]),
      ["", "", "", "", "Filtered expense total", expenses],
    ];
    const csvContent = `\uFEFF${rows
      .map((row) => row.map(escapeCsvValue).join(","))
      .join("\r\n")}`;
    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const safeProductName =
      productFilter === "all"
        ? "all-products"
        : productFilter.replace(/[^a-z0-9-]+/gi, "-");
    link.href = url;
    link.download = `inventory-expenses-${fromDate}-to-${toDate}-${safeProductName}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const chartOptions: ApexOptions = {
    chart: {
      fontFamily: "Outfit, sans-serif",
      toolbar: { show: false },
      zoom: { enabled: false },
    },
    colors: ["#12b76a", "#f04438"],
    dataLabels: { enabled: false },
    stroke: { curve: "smooth", width: 3 },
    xaxis: {
      categories: chartDays.map((day) => day.date),
      labels: {
        rotate: -35,
        formatter: (value) =>
          typeof value === "string" ? value.slice(5) : "",
      },
    },
    yaxis: {
      labels: { formatter: (value) => `₹${value.toLocaleString("en-IN")}` },
    },
    tooltip: {
      x: { format: "dd MMM yyyy" },
      y: { formatter: (value) => formatCurrency(value) },
    },
    legend: { position: "top", horizontalAlign: "left" },
    grid: { borderColor: "#e5e7eb" },
  };
  const chartSeries = [
    { name: "Sales", data: chartDays.map((day) => day.sales) },
    { name: "Expenses", data: chartDays.map((day) => day.expenses) },
  ];

  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
          Inventory &amp; Sales Analysis
        </h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Review daily sales, purchase expenses, and net totals over a selected period.
        </p>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label
              htmlFor="analytics-from-date"
              className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-400"
            >
              From
            </label>
            <input
              id="analytics-from-date"
              type="date"
              value={fromDate}
              onChange={(event) => setFromDate(event.target.value)}
              className={fieldClassName}
            />
          </div>
          <div>
            <label
              htmlFor="analytics-to-date"
              className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-400"
            >
              To
            </label>
            <input
              id="analytics-to-date"
              type="date"
              value={toDate}
              onChange={(event) => setToDate(event.target.value)}
              className={fieldClassName}
            />
          </div>
          <div>
            <label
              htmlFor="analytics-product-filter"
              className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-400"
            >
              Expense product
            </label>
            <select
              id="analytics-product-filter"
              value={productFilter}
              onChange={(event) => setProductFilter(event.target.value)}
              className={fieldClassName}
            >
              <option value="all">All products</option>
              {productOptions.map((product) => (
                <option key={product} value={product}>
                  {product}
                </option>
              ))}
            </select>
          </div>
        </div>
        {invalidDateRange && (
          <p role="alert" className="mt-3 text-sm text-red-600 dark:text-red-400">
            The start date must be on or before the end date.
          </p>
        )}
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { label: "Sales", value: sales, color: "text-green-600 dark:text-green-400" },
          { label: "Expenses", value: expenses, color: "text-red-600 dark:text-red-400" },
          { label: "Net", value: net, color: "text-gray-900 dark:text-white" },
        ].map((metric) => (
          <div
            key={metric.label}
            className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]"
          >
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {metric.label} · {fromDate} to {toDate}
            </p>
            <p className={`mt-2 text-2xl font-bold ${metric.color}`}>
              {loading ? "Loading..." : formatCurrency(metric.value)}
            </p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            Sales and expenses over time
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Daily totals for the selected date range. Sales are entered as one daily total and are not split by product.
          </p>
        </div>
        {loading ? (
          <p className="py-12 text-center text-sm text-gray-500 dark:text-gray-400">
            Loading inventory analysis...
          </p>
        ) : invalidDateRange ? null : chartDays.length === 0 ? (
          <p className="py-12 text-center text-sm text-gray-500 dark:text-gray-400">
            Select a valid date range to see the chart.
          </p>
        ) : (
          <Chart
            options={chartOptions}
            series={chartSeries}
            type="area"
            height={320}
          />
        )}
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              Expense details
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Purchase expenses filtered by the selected date range and product.
            </p>
          </div>
          <button
            type="button"
            onClick={exportExpenses}
            disabled={
              loading ||
              invalidDateRange ||
              expenseTransactions.length === 0
            }
            title="Downloads an Excel-compatible CSV of the filtered expense details"
            className="inline-flex h-10 items-center justify-center rounded-lg border border-gray-300 bg-white px-4 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            Export to Excel
          </button>
        </div>
        {loading ? (
          <p className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
            Loading expenses...
          </p>
        ) : invalidDateRange ? (
          <p className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
            Choose a valid date range to view expenses.
          </p>
        ) : expenseTransactions.length === 0 ? (
          <p className="rounded-xl border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
            No expenses found for these filters.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Product
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Quantity
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Unit cost
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Expense
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {expenseTransactions.map((transaction) => (
                  <tr key={transaction.id}>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                      {transaction.date}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-800 dark:text-white/90">
                      {transaction.productName}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-gray-600 dark:text-gray-400">
                      {transaction.quantity} {transaction.unit || "unit"}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-gray-600 dark:text-gray-400">
                      {formatCurrency(Number(transaction.unitCost) || 0)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-semibold text-red-600 dark:text-red-400">
                      {formatCurrency(Number(transaction.total) || 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-3 text-right text-sm font-semibold text-gray-800 dark:text-white/90"
                  >
                    Filtered expense total
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-bold text-red-600 dark:text-red-400">
                    {formatCurrency(expenses)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </section>
  );
};

export default InventoryAnalytics;
