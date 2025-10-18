// ...existing code...
import React, { useState, useEffect } from "react";
import { API_ENDPOINTS } from "../config/api";

function Bills() {
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [loading, setLoading] = useState(false);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await fetch(API_ENDPOINTS.orders);
      const data = await res.json();
      console.log("fetchOrders:", res.status, data);
      setOrders(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("fetchOrders error:", err);
      alert("Lấy đơn hàng thất bại: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleSelectOrder = (order) => {
    setSelectedOrder(order);
  };

  const handleChangeItem = (index, key, value) => {
    if (!selectedOrder) return;
    const copy = { ...selectedOrder };
    copy.items = copy.items.map((it, i) => (i === index ? { ...it, [key]: value } : it));
    setSelectedOrder(copy);
  };

  const handleComplete = async () => {
    if (!selectedOrder) {
      alert("Chưa chọn đơn hàng");
      return;
    }

    const id = selectedOrder._id || selectedOrder.id;
    if (!id) {
      console.error("selectedOrder missing id/_id", selectedOrder);
      alert("Không tìm thấy id đơn hàng");
      return;
    }

    const updatedOrder = {
      ...selectedOrder,
      status: "Đã thanh toán",
      paymentMethod,
      totalAmount: selectedOrder.items.reduce((s, it) => s + (it.quantity || 0) * (it.price || 0), 0),
    };

    const base = API_ENDPOINTS.orders.replace(/\/$/, "");
    const url = `${base}/${id}`;
    const token = localStorage.getItem("token"); // sửa nếu bạn lưu token khác

    try {
      console.log("Attempt PUT ->", url, updatedOrder);
      let res = await fetch(url, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(updatedOrder),
      });

      let text = await res.text();
      let body;
      try { body = text ? JSON.parse(text) : null; } catch { body = text; }
      console.log("PUT response:", res.status, body);

      if (res.status === 404) {
        console.warn("PUT 404, trying PATCH fallback");
        res = await fetch(url, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(updatedOrder),
        });
        text = await res.text();
        try { body = text ? JSON.parse(text) : null; } catch { body = text; }
        console.log("PATCH response:", res.status, body);
      }

      if (!res.ok) {
        const msg = (body && (body.message || body.error)) || `Update failed (${res.status})`;
        throw new Error(msg);
      }

      // Cập nhật UI: tải lại danh sách hoặc cập nhật cục bộ
      setSelectedOrder(null);
      await fetchOrders();
      alert("Cập nhật trạng thái thành công");
    } catch (err) {
      console.error("Update order error:", err);
      alert("Cập nhật thất bại: " + (err.message || err));
    }
  };

  return (
    <div>
      <h2>Danh sách đơn</h2>
      {loading ? <div>Đang tải...</div> : null}
      <ul>
        {orders.map((o) => (
          <li key={o._id || o.id}>
            <button onClick={() => handleSelectOrder(o)}>Mã: {o._id || o.id} — {o.status}</button>
          </li>
        ))}
      </ul>

      {selectedOrder && (
        <div>
          <h3>Chi tiết đơn {selectedOrder._id || selectedOrder.id}</h3>
          <div>
            <label>
              Thanh toán:
              <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                <option value="cash">Tiền mặt</option>
                <option value="card">Thẻ</option>
              </select>
            </label>
          </div>

          <button onClick={handleComplete}>Hoàn thành</button>
        </div>
      )}
    </div>
  );
}

export default Bills;
// ...existing code...