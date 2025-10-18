import { useState, useEffect } from "react";

const API_BASE = "https://nsdrink-backend.onrender.com/api";

function Bills() {
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState("cash"); // "cash" hoặc "transfer"

  // Lấy tất cả orders
  const fetchOrders = () => {
    fetch(`${API_BASE}/orders`)
      .then(res => res.json())
      .then(data => setOrders(data))
      .catch(err => console.log("Fetch orders error:", err));
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

  const handleComplete = () => {
    if (!selectedOrder) return;
    const updatedOrder = {
      ...selectedOrder,
      status: "Đã thanh toán",
      paymentMethod,
      totalAmount: selectedOrder.items.reduce((sum, i) => sum + i.quantity * i.price, 0)
    };

    fetch(`${API_BASE}/orders/${selectedOrder._id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updatedOrder)
    })
      .then(res => {
        if (!res.ok) throw new Error("Cập nhật bill thất bại!");
        return res.json();
      })
      .then(data => {
        setOrders(prev => prev.map(o => (o._id === data._id ? data : o)));
        setSelectedOrder(null);
        // Emit event để Home lắng nghe và cập nhật
        window.dispatchEvent(new Event("orderUpdated"));
      })
      .catch(err => alert(err.message));
  };

  return (
    <div className="p-4 bg-white min-h-screen">
      <h1 className="text-xl font-bold mb-4 text-orange-600">Hóa đơn</h1>

      {!selectedOrder && (
        <div className="space-y-2">
          {orders.map(order => (
            <div
              key={order._id}
              onClick={() => handleSelectOrder(order)}
              className="p-3 border rounded-lg hover:bg-orange-50 cursor-pointer flex justify-between"
            >
              <span>Bàn {order.tableNumber}</span>
              <span>{order.totalAmount.toLocaleString()}₫</span>
              <span className={order.status === "Đã thanh toán" ? "text-green-600" : "text-red-500"}>
                {order.status || "Chưa thanh toán"}
              </span>
            </div>
          ))}
        </div>
      )}

      {selectedOrder && (
        <div className="space-y-4">
          <button onClick={() => setSelectedOrder(null)} className="text-blue-500">← Quay lại</button>
          <h2 className="text-lg font-semibold">Bàn {selectedOrder.tableNumber}</h2>

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
              />{" "}
              Tiền mặt
            </label>
            <label>
              <input
                type="radio"
                name="payment"
                value="transfer"
                checked={paymentMethod === "transfer"}
                onChange={() => setPaymentMethod("transfer")}
              />{" "}
              Chuyển khoản
            </label>
          </div>

          <div className="mt-4 font-semibold">
            Tổng: {selectedOrder.items.reduce((sum, i) => sum + i.quantity * i.price, 0).toLocaleString()}₫
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
