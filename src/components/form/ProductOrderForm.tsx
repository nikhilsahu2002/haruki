import React, { FormEvent, useState } from "react";
import { addDoc, collection, serverTimestamp, getFirestore } from "firebase/firestore";
import { app } from "../../../Firebase";

type ProductValue = "dorayaki" | "oreo-shake";
type PaymentMode = "cash" | "upi";
const db = getFirestore(app);

interface Product {
    value: ProductValue;
    label: string;
    price: number;
}

interface OrderRow {
    id: number;
    product: ProductValue;
    qty: number;
    paymentMode: PaymentMode;
}

const products: Product[] = [
    { value: "dorayaki", label: "Dorayaki", price: 40 },
    { value: "oreo-shake", label: "Oreo Shake", price: 45 },
];

const getPriceByProduct = (productValue: ProductValue): number => {
    return products.find((item) => item.value === productValue)?.price ?? 0;
};

const createNewRow = (id: number): OrderRow => ({
    id,
    product: "dorayaki",
    qty: 1,
    paymentMode: "cash",
});

const ProductOrderForm: React.FC = () => {
    const [rows, setRows] = useState<OrderRow[]>([createNewRow(1)]);
    const [status, setStatus] = useState("");
    const [loading, setLoading] = useState(false);

    const handleRowChange = <K extends keyof OrderRow>(
        id: number,
        field: K,
        value: OrderRow[K]
    ) => {
        setRows((prevRows) =>
            prevRows.map((row) =>
                row.id === id ? { ...row, [field]: value } : row
            )
        );
    };

    const addRow = () => {
        setRows((prevRows) => [...prevRows, createNewRow(Date.now())]);
    };

    const removeRow = (id: number) => {
        if (rows.length === 1) return;
        setRows((prevRows) => prevRows.filter((row) => row.id !== id));
    };

    const grandTotal = rows.reduce((sum, row) => {
        return sum + getPriceByProduct(row.product) * row.qty;
    }, 0);

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        setStatus("");

        try {
            const orderData = rows.map((row) => {
                const selectedProduct = products.find((item) => item.value === row.product);
                const price = getPriceByProduct(row.product);

                return {
                    product: selectedProduct?.label ?? "",
                    qty: row.qty,
                    price,
                    paymentMode: row.paymentMode,
                    total: price * row.qty,
                };
            });

            // Save to Firestore
            await addDoc(collection(db, "orders"), {
                items: orderData,
                grandTotal,
                createdAt: serverTimestamp(),
            });

            setStatus("✓ All orders saved successfully!");
            setRows([createNewRow(1)]); // Reset to one empty row
        } catch (error) {
            setStatus(
                `Error saving orders: ${error instanceof Error ? error.message : "Unknown error"}`
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
            <div className="mb-5 flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                        Product Order Form
                    </h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        Add multiple product orders at once.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={addRow}
                    className="inline-flex items-center justify-center rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white shadow-theme-xs hover:bg-brand-600"
                >
                    + Add Row
                </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                {rows.map((row, index) => {
                    const price = getPriceByProduct(row.product);
                    const total = price * row.qty;

                    return (
                        <div
                            key={row.id}
                            className="rounded-xl border border-gray-200 p-4 dark:border-gray-700"
                        >
                            <div className="mb-4 flex items-center justify-between">
                                <h4 className="text-sm font-semibold text-gray-800 dark:text-white/90">
                                    Order Row {index + 1}
                                </h4>

                                {rows.length > 1 && (
                                    <button
                                        type="button"
                                        onClick={() => removeRow(row.id)}
                                        className="text-sm font-medium text-red-500 hover:text-red-600"
                                    >
                                        Remove
                                    </button>
                                )}
                            </div>

                            <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
                                <div>
                                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-400">
                                        Product Name
                                    </label>
                                    <select
                                        value={row.product}
                                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                                            handleRowChange(
                                                row.id,
                                                "product",
                                                e.target.value as ProductValue
                                            )
                                        }
                                        className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 outline-none focus:border-brand-500 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                                    >
                                        {products.map((item) => (
                                            <option key={item.value} value={item.value}>
                                                {item.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-400">
                                        Qty
                                    </label>
                                    <input
                                        type="number"
                                        min={1}
                                        value={row.qty}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                            handleRowChange(
                                                row.id,
                                                "qty",
                                                Number(e.target.value) || 1
                                            )
                                        }
                                        className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 outline-none focus:border-brand-500 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                                    />
                                </div>

                                <div>
                                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-400">
                                        Price
                                    </label>
                                    <input
                                        type="number"
                                        value={price}
                                        readOnly
                                        className="h-11 w-full rounded-lg border border-gray-300 bg-gray-100 px-4 py-2.5 text-sm text-gray-800 outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white/90"
                                    />
                                </div>

                                <div>
                                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-400">
                                        Payment Mode
                                    </label>
                                    <select
                                        value={row.paymentMode}
                                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                                            handleRowChange(
                                                row.id,
                                                "paymentMode",
                                                e.target.value as PaymentMode
                                            )
                                        }
                                        className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 outline-none focus:border-brand-500 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                                    >
                                        <option value="cash">Cash</option>
                                        <option value="upi">UPI</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-400">
                                        Total
                                    </label>
                                    <input
                                        type="number"
                                        value={total}
                                        readOnly
                                        className="h-11 w-full rounded-lg border border-gray-300 bg-gray-100 px-4 py-2.5 text-sm font-semibold text-gray-800 outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white/90"
                                    />
                                </div>
                            </div>
                        </div>
                    );
                })}

                <div className="rounded-xl bg-gray-50 p-4 dark:bg-gray-800/50">
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Grand Total
                        </span>
                        <span className="text-lg font-bold text-gray-900 dark:text-white">
                            ₹{grandTotal}
                        </span>
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="inline-flex items-center justify-center rounded-lg bg-brand-500 px-5 py-3 text-sm font-medium text-white shadow-theme-xs hover:bg-brand-600 disabled:opacity-50"
                >
                    {loading ? "Saving..." : "Save All Orders"}
                </button>

                {status && (
                    <div
                        className={`rounded-lg p-3 text-center font-medium ${
                            status.includes("✓")
                                ? "bg-green-50 text-green-600 dark:bg-green-900 dark:text-green-200"
                                : "bg-red-50 text-red-600 dark:bg-red-900 dark:text-red-200"
                        }`}
                    >
                        {status}
                    </div>
                )}
            </form>
        </div>
    );
};

export default ProductOrderForm;