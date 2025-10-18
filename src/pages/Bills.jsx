// src/Pages/Bills.jsx
import { useState, useEffect } from "react";
import { API_ENDPOINTS } from "../config/api";

function Bills() {
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [loading, setLoading] = useState(false);

  // Lấy orders
  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await fetch(API_ENDPOINTS.orders);
      const data = await res.json();
      setOrders(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("fetchOrders error:", err);
      alert("Lấy đơn hàng thất bại: " + (err.message || err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleSelectOrder = (order) => {
    setSelectedOrder(order);
    setPaymentMethod(order.paymentMethod || "cash");
  };

  const handleChangeItem = (index, key, value) => {
    const newItems = [...selectedOrder.items];
    newItems[index][key] = key === "quantity" || key === "price" ? Number(value) : value;
    setSelectedOrder({ ...selectedOrder, items: newItems });
  };

  const handleComplete = async () => {
    if (!selectedOrder) return;

    const id = selectedOrder._id || selectedOrder.id;
    const updatedOrder = {
      ...selectedOrder,
      status: "Đã thanh toán",
      paymentMethod,
      totalAmount: (selectedOrder.items || []).reduce(
        (s, it) => s + (it.quantity || 0) * (it.price || 0),
        0
      ),
    };

    const url = `${API_ENDPOINTS.orders.replace(/\/$/, "")}/${id}`;
    const token = localStorage.getItem("token");

    try {
      let res = await fetch(url, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(updatedOrder),
      });

      const text = await res.text();
      let body;
      try { body = text ? JSON.parse(text) : null; } catch { body = text; }

      if (res.status === 404) {
        res = await fetch(url, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            status: updatedOrder.status,
            paymentMethod: updatedOrder.paymentMethod,
            totalAmount: updatedOrder.totalAmount,
          }),
        });
      }

      if (!res.ok) throw new Error((body && (body.message || body.error)) || `Update failed (${res.status})`);

      setSelectedOrder(null);
      await fetchOrders();
      alert("Cập nhật trạng thái thành công");
    } catch (err) {
      console.error("Update order error:", err);
      alert("Cập nhật thất bại: " + (err.message || err));
    }
  };

  return (
    <div className="p-4 bg-white min-h-screen">
      <h1 className="text-xl font-bold mb-4 text-orange-600">Hóa đơn</h1>

      {/* Danh sách orders */}
      {loading ? (
        <div>Đang tải...</div>
      ) : !selectedOrder ? (
        <div className="space-y-2">
          {orders.map((order) => (
            <div
              key={order._id || order.id}
              onClick={() => handleSelectOrder(order)}
              className="p-3 border rounded-lg hover:bg-orange-50 cursor-pointer flex justify-between"
            >
              <div className="flex flex-col">
                <span>Bàn {order.tableNumber}</span>
                <span className="text-xs text-gray-500">
                  {new Date(order.createdAt).toLocaleString()}
                </span>
              </div>
              <span>{order.totalAmount?.toLocaleString() || 0}₫</span>
              <span className={order.status === "Đã thanh toán" ? "text-green-600" : "text-red-500"}>
                {order.status || "Chưa thanh toán"}
              </span>
            </div>
          ))}
        </div>
      ) : (
        // Chi tiết order
        <div className="space-y-4">
          <button onClick={() => setSelectedOrder(null)} className="text-blue-500">← Quay lại</button>
          <h2 className="text-lg font-semibold">Bàn {selectedOrder.tableNumber}</h2>
          <span className="text-sm text-gray-500">
            Ngày tạo: {new Date(selectedOrder.createdAt).toLocaleString()}
          </span>

          <table className="w-full border border-orange-200 text-sm">
            <thead>
              <tr className="bg-orange-100 text-orange-700">
                <th className="p-2">Món</th>
                <th className="p-2">Số lượng</th>
                <th className="p-2">Giá</th>
                <th className="p-2">Ghi chú</th>
              </tr>
            </thead>
            <tbody>
              {selectedOrder.items.map((item, idx) => (
                <tr key={idx} className="border-t">
                  <td className="p-2">{item.name}</td>
                  <td className="p-2">
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => handleChangeItem(idx, "quantity", e.target.value)}
                      className="w-16 border rounded px-1"
                    />
                  </td>
                  <td className="p-2">
                    <input
                      type="number"
                      value={item.price}
                      onChange={(e) => handleChangeItem(idx, "price", e.target.value)}
                      className="w-24 border rounded px-1"
                    />
                  </td>
                  <td className="p-2">
                    <input
                      type="text"
                      value={item.note || ""}
                      onChange={(e) => handleChangeItem(idx, "note", e.target.value)}
                      className="border rounded px-1"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex items-center gap-4 mt-2">
            <label>
              <input
                type="radio"
                name="payment"
                value="cash"
                checked={paymentMethod === "cash"}
                onChange={() => setPaymentMethod("cash")}
              />{" "}Tiền mặt
            </label>
            <label>
              <input
                type="radio"
                name="payment"
                value="card"
                checked={paymentMethod === "card"}
                onChange={() => setPaymentMethod("card")}
              />{" "}Thẻ
            </label>
          </div>

          <div className="mt-4 font-semibold">
            Tổng: {selectedOrder.items.reduce((sum, i) => sum + (i.quantity || 0) * (i.price || 0), 0).toLocaleString()}₫
          </div>

          <button
            onClick={handleComplete}
            className="bg-green-500 text-white px-4 py-2 rounded-lg mt-2"
          >
            Hoàn thành
          </button>
        </div>
      )}
    </div>
  );
}

export default Bills;
