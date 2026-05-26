import React, { FormEvent, useState } from "react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../../../Firebase";
import UnpaidOrdersTable from "../ecommerce/UnpaidOrdersTable";

type ProductValue = "dorayaki" | "oreo-shake";
type PaymentMode = "paid" | "not-paid";
type DorayakiFlavor = "chocolate" | "white-chocolate" | "nutella";
type DorayakiSize = "mini" | "regular";

interface Product {
    value: ProductValue;
    label: string;
    price: number;
}

interface OrderRow {
    id: number;
    product: ProductValue;
    flavor: DorayakiFlavor;
    size: DorayakiSize;
    qty: number;
    paymentMode: PaymentMode;
}

const products: Product[] = [
    { value: "dorayaki", label: "Dorayaki", price: 0 },
    { value: "oreo-shake", label: "Oreo Shake", price: 45 },
];

const dorayakiPrices: Record<DorayakiSize, Record<DorayakiFlavor, number>> = {
    mini: {
        chocolate: 50,
        "white-chocolate": 50,
        nutella: 75,
    },
    regular: {
        chocolate: 80,
        "white-chocolate": 80,
        nutella: 120,
    },
};

const getPriceByRow = (row: OrderRow): number => {
    if (row.product === "dorayaki") {
        return dorayakiPrices[row.size][row.flavor];
    }
    return products.find((item) => item.value === row.product)?.price ?? 0;
};

const getProductDisplayLabel = (row: OrderRow): string => {
    if (row.product === "dorayaki") {
        const flavorLabel =
            row.flavor === "white-chocolate"
                ? "White Chocolate"
                : row.flavor === "nutella"
                ? "Nutella"
                : "Chocolate";
        const sizeLabel = row.size === "mini" ? "Mini" : "Regular";
        return `Dorayaki - ${flavorLabel} (${sizeLabel})`;
    }
    return products.find((item) => item.value === row.product)?.label ?? "";
};

const createNewRow = (id: number): OrderRow => ({
    id,
    product: "dorayaki",
    flavor: "chocolate",
    size: "mini",
    qty: 1,
    paymentMode: "paid",
});

const ProductOrderForm: React.FC = () => {
    const [customerName, setCustomerName] = useState("");
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

    const updateQty = (id: number, qty: number) => {
        setRows((prevRows) =>
            prevRows.map((row) =>
                row.id === id
                    ? { ...row, qty: qty < 1 ? 1 : qty }
                    : row
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
        return sum + getPriceByRow(row) * row.qty;
    }, 0);

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        setStatus("");

        try {
            const orderData = rows.map((row) => {
                const price = getPriceByRow(row);

                return {
                    customerName: customerName.trim() || "Unknown",
                    product: row.product === "dorayaki" ? "Dorayaki" : "Oreo Shake",
                    variant:
                        row.product === "dorayaki"
                            ? {
                                  flavor: row.flavor,
                                  size: row.size,
                              }
                            : null,
                    label: getProductDisplayLabel(row),
                    qty: row.qty,
                    price,
                    paymentMode: row.paymentMode,
                    total: price * row.qty,
                };
            });

            await addDoc(collection(db, "orders"), {
                items: orderData,
                grandTotal,
                status: "cooking",
                createdAt: serverTimestamp(),
            });

            setStatus("✓ Order sent to cooking successfully!");
            setCustomerName("");
            setRows([createNewRow(1)]);
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
            <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                        Product Order Form
                    </h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        One customer can place multiple orders at once.
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
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                        <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-400">
                            Customer Name
                        </label>
                        <input
                            type="text"
                            value={customerName}
                            onChange={(e) => setCustomerName(e.target.value)}
                            placeholder="Who is this order for?"
                            className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 outline-none focus:border-brand-500 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                        />
                    </div>
                    <div className="flex items-end">
                        <button
                            type="button"
                            onClick={addRow}
                            className="h-11 w-full rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white shadow-theme-xs hover:bg-brand-600"
                        >
                            + Add Order Row
                        </button>
                    </div>
                </div>

                {rows.map((row, index) => {
                    const price = getPriceByRow(row);
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

                            <div className="grid grid-cols-1 gap-4 xl:grid-cols-6">
                                <div className="xl:col-span-2">
                                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-400">
                                        Product Name
                                    </label>
                                    <select
                                        value={row.product}
                                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                                            handleRowChange(row.id, "product", e.target.value as ProductValue)
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

                                {row.product === "dorayaki" && (
                                    <>
                                        <div>
                                            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-400">
                                                Flavor
                                            </label>
                                            <select
                                                value={row.flavor}
                                                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                                                    handleRowChange(row.id, "flavor", e.target.value as DorayakiFlavor)
                                                }
                                                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 outline-none focus:border-brand-500 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                                            >
                                                <option value="chocolate">Chocolate</option>
                                                <option value="white-chocolate">White Chocolate</option>
                                                <option value="nutella">Nutella</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-400">
                                                Size
                                            </label>
                                            <select
                                                value={row.size}
                                                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                                                    handleRowChange(row.id, "size", e.target.value as DorayakiSize)
                                                }
                                                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 outline-none focus:border-brand-500 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                                            >
                                                <option value="mini">Mini</option>
                                                <option value="regular">Regular</option>
                                            </select>
                                        </div>
                                    </>
                                )}
                            </div>

                            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-5">
                                <div>
                                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-400">
                                        Quantity
                                    </label>
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => updateQty(row.id, row.qty - 1)}
                                            className="h-11 w-11 rounded-lg border border-gray-300 bg-white text-lg text-gray-700 transition hover:border-brand-500 hover:text-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:hover:text-brand-400"
                                        >
                                            −
                                        </button>
                                        <input
                                            type="number"
                                            min={1}
                                            value={row.qty}
                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                                updateQty(row.id, Number(e.target.value) || 1)
                                            }
                                            className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-center text-gray-800 outline-none focus:border-brand-500 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => updateQty(row.id, row.qty + 1)}
                                            className="h-11 w-11 rounded-lg border border-gray-300 bg-white text-lg text-gray-700 transition hover:border-brand-500 hover:text-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:hover:text-brand-400"
                                        >
                                            +
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-400">
                                        Payment Status
                                    </label>
                                    <select
                                        value={row.paymentMode}
                                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                                            handleRowChange(row.id, "paymentMode", e.target.value as PaymentMode)
                                        }
                                        className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 outline-none focus:border-brand-500 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                                    >
                                        <option value="paid">Paid</option>
                                        <option value="not-paid">Not Paid</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-400">
                                        Unit Price
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
                                        Total Price
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
                    {loading ? "Saving..." : "Send to Cook"}
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

            <div className="mt-8">
                <UnpaidOrdersTable />
            </div>
        </div>
    );
};

export default ProductOrderForm;