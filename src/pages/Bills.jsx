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
      totalAmount: (selectedOrder.items || []).reduce((s, it) => s + (it.quantity || 0) * (it.price || 0), 0),
    };

    const url = `${API_ENDPOINTS.orders.replace(/\/$/, "")}/${id}`;
    const token = localStorage.getItem("token");

    try {
      // Thử PUT trước, nếu 404 thử PATCH
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
      console.log("update response:", res.status, body);

      if (res.status === 404) {
        res = await fetch(url, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ status: updatedOrder.status, paymentMethod: updatedOrder.paymentMethod, totalAmount: updatedOrder.totalAmount }),
        });
        const t2 = await res.text();
        try { body = t2 ? JSON.parse(t2) : null; } catch { body = t2; }
        console.log("patch response:", res.status, body);
      }

      if (!res.ok) {
        const msg = (body && (body.message || body.error)) || `Update failed (${res.status})`;
        throw new Error(msg);
      }

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
      {loading && <div>Đang tải...</div>}
      <ul>
        {orders.map((o) => (
          <li key={o._id || o.id}>
            <button onClick={() => handleSelectOrder(o)}>
              Mã: {o._id || o.id} — {o.status}
            </button>
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