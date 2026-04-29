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
}

interface ProductSale {
  product: string;
  quantity: number;
  revenue: number;
  avgPrice: number;
}

const TopSellingProducts: React.FC = () => {
  const [products, setProducts] = useState<ProductSale[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "orders"));
        const ordersData = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Order[];

        // Aggregate product data
        const productMap: { [key: string]: ProductSale } = {};

        ordersData.forEach((order) => {
          order.items.forEach((item) => {
            if (!productMap[item.product]) {
              productMap[item.product] = {
                product: item.product,
                quantity: 0,
                revenue: 0,
                avgPrice: 0,
              };
            }
            productMap[item.product].quantity += item.qty;
            productMap[item.product].revenue += item.total;
          });
        });

        // Calculate average price and sort by quantity
        const productsArray = Object.values(productMap)
          .map((product) => ({
            ...product,
            avgPrice: product.quantity > 0 ? product.revenue / product.quantity : 0,
          }))
          .sort((a, b) => b.quantity - a.quantity)
          .slice(0, 10); // Top 10 products

        setProducts(productsArray);
      } catch (error) {
        console.error("Error fetching orders:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  if (loading) {
    return <div>Loading products data...</div>;
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
          Top Selling Products
        </h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Most popular products by quantity sold
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                Product
              </th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">
                Qty Sold
              </th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">
                Avg Price
              </th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">
                Total Revenue
              </th>
            </tr>
          </thead>
          <tbody>
            {products.length > 0 ? (
              products.map((product, index) => (
                <tr
                  key={index}
                  className="border-b border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800/50"
                >
                  <td className="px-4 py-3 text-sm text-gray-800 dark:text-white/90">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-brand-500/10 text-sm font-semibold text-brand-500">
                        {index + 1}
                      </span>
                      {product.product}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-medium text-gray-800 dark:text-white/90">
                    {product.quantity}
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-gray-600 dark:text-gray-400">
                    ₹{product.avgPrice.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-semibold text-green-600 dark:text-green-400">
                    ₹{product.revenue.toLocaleString("en-IN")}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="px-4 py-3 text-center text-sm text-gray-500">
                  No products found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TopSellingProducts;
