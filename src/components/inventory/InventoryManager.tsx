import React, { FormEvent, useEffect, useMemo, useState } from "react";
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { db } from "../../../Firebase";

interface InventoryProduct {
  id: string;
  name: string;
  unit: string;
  unitCost: number;
  stock: number;
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

const fieldClassName =
  "h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 outline-none focus:border-brand-500 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90";

const getLocalDate = () => {
  const date = new Date();
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
};

const formatCurrency = (amount: number) =>
  `₹${amount.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const InventoryManager: React.FC = () => {
  const [products, setProducts] = useState<InventoryProduct[]>([]);
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [dailySalesByDate, setDailySalesByDate] = useState<Record<string, number>>({});
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingPurchases, setLoadingPurchases] = useState(true);
  const [loadingSales, setLoadingSales] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [productName, setProductName] = useState("");
  const [productUnit, setProductUnit] = useState("");
  const [productUnitCost, setProductUnitCost] = useState("");
  const [savingProduct, setSavingProduct] = useState(false);
  const [productError, setProductError] = useState("");
  const [productSuccess, setProductSuccess] = useState("");

  const [selectedProductId, setSelectedProductId] = useState("");
  const [purchaseQuantity, setPurchaseQuantity] = useState("1");
  const [summaryDate, setSummaryDate] = useState(getLocalDate);
  const [savingPurchase, setSavingPurchase] = useState(false);
  const [purchaseError, setPurchaseError] = useState("");
  const [purchaseSuccess, setPurchaseSuccess] = useState("");
  const [saleAmount, setSaleAmount] = useState("");
  const [savingSale, setSavingSale] = useState(false);
  const [saleError, setSaleError] = useState("");
  const [saleSuccess, setSaleSuccess] = useState("");

  useEffect(() => {
    const unsubscribeProducts = onSnapshot(
      collection(db, "inventoryProducts"),
      (snapshot) => {
        const inventoryProducts = snapshot.docs.map((productDoc) => {
          const data = productDoc.data();
          return {
            id: productDoc.id,
            name: typeof data.name === "string" ? data.name : "",
            unit: typeof data.unit === "string" && data.unit ? data.unit : "unit",
            unitCost: Number(data.unitCost) || 0,
            stock: Number(data.stock) || 0,
          };
        });
        setProducts(inventoryProducts);
        setSelectedProductId((current) =>
          inventoryProducts.some((product) => product.id === current)
            ? current
            : inventoryProducts[0]?.id ?? ""
        );
        setLoadingProducts(false);
      },
      (error) => {
        console.error("Error listening for inventory products:", error);
        setLoadError("Unable to load products. Refresh the page and try again.");
        setLoadingProducts(false);
      }
    );
    const unsubscribeTransactions = onSnapshot(
      collection(db, "inventoryTransactions"),
      (snapshot) => {
        const inventoryTransactions = snapshot.docs.map(
          (transactionDoc) =>
            ({
              id: transactionDoc.id,
              ...transactionDoc.data(),
            }) as InventoryTransaction
        );
        setTransactions(
          inventoryTransactions.filter(
            (transaction) =>
              (transaction.type === "purchase" ||
                transaction.type === "sale") &&
              typeof transaction.date === "string"
          )
        );
        setLoadingPurchases(false);
      },
      (error) => {
        console.error("Error listening for inventory transactions:", error);
        setLoadError("Unable to load daily totals. Refresh and try again.");
        setLoadingPurchases(false);
      }
    );
    const unsubscribeDailySales = onSnapshot(
      collection(db, "inventoryDailySales"),
      (snapshot) => {
        const sales: Record<string, number> = {};
        snapshot.docs.forEach((saleDoc) => {
          const data = saleDoc.data();
          if (typeof data.date === "string") {
            sales[data.date] = Number(data.total) || 0;
          }
        });
        setDailySalesByDate(sales);
        setLoadingSales(false);
      },
      (error) => {
        console.error("Error listening for daily sales:", error);
        setLoadError("Unable to load daily sales. Refresh and try again.");
        setLoadingSales(false);
      }
    );

    return () => {
      unsubscribeProducts();
      unsubscribeTransactions();
      unsubscribeDailySales();
    };
  }, []);

  useEffect(() => {
    const savedSales = dailySalesByDate[summaryDate];
    setSaleAmount(savedSales === undefined ? "" : String(savedSales));
  }, [dailySalesByDate, summaryDate]);

  const selectedProduct = products.find(
    (product) => product.id === selectedProductId
  );
  const selectedDayTransactions = useMemo(
    () => transactions.filter((transaction) => transaction.date === summaryDate),
    [transactions, summaryDate]
  );
  const dailyExpenses = selectedDayTransactions
    .filter((transaction) => transaction.type === "purchase")
    .reduce((sum, transaction) => sum + Number(transaction.total || 0), 0);
  const transactionSales = selectedDayTransactions
    .filter((transaction) => transaction.type === "sale")
    .reduce((sum, transaction) => sum + Number(transaction.total || 0), 0);
  const dailySales = transactionSales + (dailySalesByDate[summaryDate] || 0);
  const dailyNet = dailySales - dailyExpenses;
  const purchaseTotal =
    selectedProduct && Number(purchaseQuantity) > 0
      ? selectedProduct.unitCost * Number(purchaseQuantity)
      : 0;
  const isLoading = loadingProducts || loadingPurchases || loadingSales;

  const resetProductForm = () => {
    setProductName("");
    setProductUnit("");
    setProductUnitCost("");
  };

  const handleProductSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setProductError("");
    setProductSuccess("");

    const name = productName.trim();
    const unit = productUnit.trim();
    const unitCost = Number(productUnitCost);
    if (!name || !unit) {
      setProductError("Enter a product name and its unit (for example, kg or litre).");
      return;
    }
    if (!Number.isFinite(unitCost) || unitCost <= 0) {
      setProductError("Enter a unit cost greater than zero.");
      return;
    }
    if (products.some((product) => product.name.toLowerCase() === name.toLowerCase())) {
      setProductError("A product with this name already exists.");
      return;
    }

    setSavingProduct(true);
    try {
      const productRef = await addDoc(collection(db, "inventoryProducts"), {
        name,
        unit,
        unitCost,
        stock: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setSelectedProductId(productRef.id);
      setProductSuccess("Product saved. You can now add it to inventory.");
      resetProductForm();
    } catch (error) {
      console.error("Error saving inventory product:", error);
      setProductError(
        error instanceof Error
          ? error.message
          : "Unable to save this product. Please try again."
      );
    } finally {
      setSavingProduct(false);
    }
  };

  const handlePurchaseSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPurchaseError("");
    setPurchaseSuccess("");

    const quantity = Number(purchaseQuantity);
    if (!selectedProduct) {
      setPurchaseError("Add a product to your product list before purchasing.");
      return;
    }
    if (!Number.isFinite(quantity) || quantity <= 0) {
      setPurchaseError("Quantity must be greater than zero.");
      return;
    }
    if (!summaryDate) {
      setPurchaseError("Choose the daily totals date.");
      return;
    }

    setSavingPurchase(true);
    try {
      const productRef = doc(db, "inventoryProducts", selectedProduct.id);
      const purchaseRef = doc(collection(db, "inventoryTransactions"));
      await runTransaction(db, async (firestoreTransaction) => {
        const productSnapshot = await firestoreTransaction.get(productRef);
        if (!productSnapshot.exists()) {
          throw new Error("This product no longer exists. Refresh and try again.");
        }

        const latestProduct = productSnapshot.data();
        const unitCost = Number(latestProduct.unitCost) || 0;
        const latestQuantity = Number(latestProduct.stock) || 0;
        const latestName =
          typeof latestProduct.name === "string"
            ? latestProduct.name
            : selectedProduct.name;
        const unit =
          typeof latestProduct.unit === "string" && latestProduct.unit
            ? latestProduct.unit
            : selectedProduct.unit;
        if (unitCost <= 0) {
          throw new Error("Set a valid unit cost for this product before purchasing.");
        }

        firestoreTransaction.update(productRef, {
          stock: latestQuantity + quantity,
          updatedAt: serverTimestamp(),
        });
        firestoreTransaction.set(purchaseRef, {
          productId: selectedProduct.id,
          productName: latestName,
          type: "purchase",
          unit,
          quantity,
          unitCost,
          total: quantity * unitCost,
          date: summaryDate,
          createdAt: serverTimestamp(),
        });
      });

      setPurchaseSuccess("Purchase added to inventory.");
      setPurchaseQuantity("1");
    } catch (error) {
      console.error("Error adding inventory purchase:", error);
      setPurchaseError(
        error instanceof Error
          ? error.message
          : "Unable to add this purchase. Please try again."
      );
    } finally {
      setSavingPurchase(false);
    }
  };

  const handleSaleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaleError("");
    setSaleSuccess("");

    const amount = Number(saleAmount);
    if (!Number.isFinite(amount) || amount < 0 || saleAmount === "") {
      setSaleError("Enter a valid daily sales amount of zero or more.");
      return;
    }

    setSavingSale(true);
    try {
      await setDoc(doc(db, "inventoryDailySales", summaryDate), {
        date: summaryDate,
        total: amount,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setSaleSuccess(`Daily sales for ${summaryDate} saved.`);
    } catch (error) {
      console.error("Error recording inventory sale:", error);
      setSaleError(
        error instanceof Error
          ? error.message
          : "Unable to record this sale. Please try again."
      );
    } finally {
      setSavingSale(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">
          Inventory
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Set up products, record purchases, and update daily sales.
        </p>
      </div>

      <div className="flex justify-end">
        <div className="w-full sm:max-w-xs">
          <label
            htmlFor="inventory-summary-date"
            className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-400"
          >
            Daily totals date
          </label>
          <input
            id="inventory-summary-date"
            type="date"
            value={summaryDate}
            onChange={(event) => setSummaryDate(event.target.value)}
            className={fieldClassName}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Sales on {summaryDate}
          </p>
          <p className="mt-2 text-2xl font-bold text-green-600 dark:text-green-400">
            {formatCurrency(dailySales)}
          </p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Expenses on {summaryDate}
          </p>
          <p className="mt-2 text-2xl font-bold text-red-600 dark:text-red-400">
            {formatCurrency(dailyExpenses)}
          </p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Net on {summaryDate}
          </p>
          <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
            {formatCurrency(dailyNet)}
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
        <div className="mb-5">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            Add a product
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Save each product with its unit and standard cost. It will be available in the purchase and sale forms.
          </p>
        </div>

        <form onSubmit={handleProductSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label
                htmlFor="inventory-product-name"
                className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-400"
              >
                Product name
              </label>
              <input
                id="inventory-product-name"
                type="text"
                required
                value={productName}
                onChange={(event) => setProductName(event.target.value)}
                placeholder="Milk"
                className={fieldClassName}
              />
            </div>
            <div>
              <label
                htmlFor="inventory-product-unit"
                className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-400"
              >
                Unit
              </label>
              <input
                id="inventory-product-unit"
                type="text"
                required
                value={productUnit}
                onChange={(event) => setProductUnit(event.target.value)}
                placeholder="kg, litre, piece..."
                className={fieldClassName}
              />
            </div>
            <div>
              <label
                htmlFor="inventory-product-cost"
                className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-400"
              >
                Cost per unit (₹)
              </label>
              <input
                id="inventory-product-cost"
                type="number"
                min="0.01"
                step="0.01"
                required
                value={productUnitCost}
                onChange={(event) => setProductUnitCost(event.target.value)}
                placeholder="0.00"
                className={fieldClassName}
              />
            </div>
          </div>
          {productError && (
            <p role="alert" className="text-sm text-red-600 dark:text-red-400">
              {productError}
            </p>
          )}
          {productSuccess && (
            <p role="status" className="text-sm text-green-600 dark:text-green-400">
              {productSuccess}
            </p>
          )}
          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={savingProduct || Boolean(loadError)}
              className="inline-flex h-11 items-center justify-center rounded-lg bg-brand-500 px-5 text-sm font-medium text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {savingProduct ? "Saving..." : "Save product"}
            </button>
          </div>
        </form>

        {loadError && (
          <p role="alert" className="mt-4 text-sm text-red-600 dark:text-red-400">
            {loadError}
          </p>
        )}

      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
        <div className="mb-5">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            Add purchase to inventory
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Choose a saved product and enter the quantity. Unit and cost are filled from your product list.
          </p>
        </div>

        <form onSubmit={handlePurchaseSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label
                htmlFor="inventory-purchase-product"
                className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-400"
              >
                Product
              </label>
              <select
                id="inventory-purchase-product"
                required
                value={selectedProductId}
                onChange={(event) => setSelectedProductId(event.target.value)}
                disabled={products.length === 0}
                className={fieldClassName}
              >
                {products.length === 0 ? (
                  <option value="">Add a product first</option>
                ) : (
                  products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name}
                    </option>
                  ))
                )}
              </select>
            </div>
            <div>
              <label
                htmlFor="inventory-purchase-quantity"
                className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-400"
              >
                Quantity
              </label>
              <input
                id="inventory-purchase-quantity"
                type="number"
                min="0.01"
                step="any"
                required
                value={purchaseQuantity}
                onChange={(event) => setPurchaseQuantity(event.target.value)}
                className={fieldClassName}
              />
            </div>
            <div>
              <label
                htmlFor="inventory-purchase-unit-cost"
                className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-400"
              >
                Cost per {selectedProduct?.unit || "unit"}
              </label>
              <input
                id="inventory-purchase-unit-cost"
                type="text"
                readOnly
                value={
                  selectedProduct?.unitCost
                    ? formatCurrency(selectedProduct.unitCost)
                    : ""
                }
                placeholder="Set product cost first"
                className={`${fieldClassName} bg-gray-50 dark:bg-gray-800`}
              />
            </div>
            <div>
              <label
                htmlFor="inventory-purchase-total"
                className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-400"
              >
                Purchase total
              </label>
              <input
                id="inventory-purchase-total"
                type="text"
                readOnly
                value={formatCurrency(purchaseTotal)}
                className={`${fieldClassName} bg-gray-50 dark:bg-gray-800`}
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={
                savingPurchase ||
                isLoading ||
                products.length === 0 ||
                Boolean(loadError)
              }
              className="inline-flex h-11 items-center justify-center rounded-lg bg-brand-500 px-5 text-sm font-medium text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {savingPurchase ? "Adding..." : "Add to inventory"}
            </button>
          </div>
          {purchaseError && (
            <p role="alert" className="text-sm text-red-600 dark:text-red-400">
              {purchaseError}
            </p>
          )}
          {purchaseSuccess && (
            <p role="status" className="text-sm text-green-600 dark:text-green-400">
              {purchaseSuccess}
            </p>
          )}
        </form>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
        <div className="mb-5">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            Record a sale
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Add each product sale for the day.             Set the total sales for the selected date. Saving again updates that date's total.
          </p>
        </div>

        <form onSubmit={handleSaleSubmit} className="space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="w-full sm:max-w-xs">
              <label
                htmlFor="inventory-sale-amount"
                className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-400"
              >
                Total sales for {summaryDate} (₹)
              </label>
              <input
                id="inventory-sale-amount"
                type="number"
                min="0"
                step="0.01"
                required
                value={saleAmount}
                onChange={(event) => setSaleAmount(event.target.value)}
                placeholder="0.00"
                className={fieldClassName}
              />
            </div>
            <button
              type="submit"
              disabled={savingSale || loadingSales || Boolean(loadError)}
              className="inline-flex h-11 items-center justify-center rounded-lg bg-brand-500 px-5 text-sm font-medium text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {savingSale ? "Saving..." : "Save daily sales"}
            </button>
          </div>
          {saleError && (
            <p role="alert" className="text-sm text-red-600 dark:text-red-400">
              {saleError}
            </p>
          )}
          {saleSuccess && (
            <p role="status" className="text-sm text-green-600 dark:text-green-400">
              {saleSuccess}
            </p>
          )}
        </form>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              Expense list
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Purchases recorded on {summaryDate}
            </p>
          </div>
          <p className="text-right text-sm font-semibold text-red-600 dark:text-red-400">
            Total: {formatCurrency(dailyExpenses)}
          </p>
        </div>
        {isLoading ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Loading expenses...
          </p>
        ) : selectedDayTransactions.filter(
            (transaction) => transaction.type === "purchase"
          ).length === 0 ? (
          <p className="rounded-xl border border-dashed border-gray-300 p-5 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
            No expenses recorded for this date.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead>
                <tr>
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
                {selectedDayTransactions
                  .filter((transaction) => transaction.type === "purchase")
                  .map((transaction) => (
                    <tr key={transaction.id}>
                      <td className="px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-200">
                        {transaction.productName}
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-gray-700 dark:text-gray-200">
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
                    colSpan={3}
                    className="px-4 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-200"
                  >
                    Total expenses
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-bold text-red-600 dark:text-red-400">
                    {formatCurrency(dailyExpenses)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default InventoryManager;
