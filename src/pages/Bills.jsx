import React, { useState, useEffect } from "react";
import { API_ENDPOINTS } from "../config/api";

function Bills() {
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState("cash"); // "cash" hoặc "transfer"
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalOrders: 0,
    hasNextPage: false,
    hasPreviousPage: false,
    limit: 20
  });
  const [loading, setLoading] = useState(false);
  
  // Lấy thông tin user hiện tại để kiểm tra quyền admin
  const currentUser = JSON.parse(localStorage.getItem("currentUser"));
  const isAdmin = currentUser?.role === "admin";

  // Lấy orders với phân trang
  const fetchOrders = async (page = 1) => {
    try {
      setLoading(true);
      const res = await fetch(`${API_ENDPOINTS.orders}?page=${page}&limit=20`);
      const data = await res.json();
      
      if (data.orders && data.pagination) {
        setOrders(Array.isArray(data.orders) ? data.orders : []);
        setPagination(data.pagination);
      } else {
        // Fallback cho API cũ
        setOrders(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.log("Fetch orders error:", err);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders(1);

    const onUpdate = () => fetchOrders(pagination.currentPage);
    window.addEventListener("orderUpdated", onUpdate);
    return () => window.removeEventListener("orderUpdated", onUpdate);
  }, []);

  // Xử lý thay đổi trang
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      fetchOrders(newPage);
    }
  };

  const handleSelectOrder = (order) => {
    setSelectedOrder(order);
    setPaymentMethod(order.paymentMethod || "cash");
  };

  const handleChangeItem = (index, key, value) => {
    const newItems = [...(selectedOrder.items || [])];
    newItems[index] = { ...newItems[index], [key]: key === "quantity" || key === "price" ? Number(value) : value };
    setSelectedOrder({ ...selectedOrder, items: newItems });
  };

  const handleComplete = async () => {
    if (!selectedOrder) return;
    const id = selectedOrder._id || selectedOrder.id;
    if (!id) return alert("Không tìm thấy id đơn hàng");

    const totalAmount = (selectedOrder.items || []).reduce((sum, i) => sum + (Number(i.quantity) || 0) * (Number(i.price) || 0), 0);

    const payload = {
      ...selectedOrder,
      status: "Đã thanh toán",
      paymentMethod,
      totalAmount,
    };

    // Thêm thông tin admin nếu cần thiết cho middleware
    if (isAdmin && currentUser?.phone) {
      payload.phone = currentUser.phone;
    }

    try {
      const url = `${API_ENDPOINTS.orders.replace(/\/$/, "")}/${id}`;
      const res = await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      let data = null;
      try { data = await res.json(); } catch { /* ignore */ }

      if (!res.ok) {
        throw new Error((data && (data.message || data.error)) || `Update failed (${res.status})`);
      }

      // cập nhật state orders local
      const updated = data && (data._id || data.id) ? data : payload;
      setOrders((prev) => prev.map((o) => ((o._id || o.id) === (updated._id || updated.id) ? updated : o)));
      setSelectedOrder(null);

      // thông báo để Home cập nhật doanh thu
      window.dispatchEvent(new Event("orderUpdated"));
    } catch (err) {
      console.error("Update order error:", err);
      alert("Cập nhật thất bại: " + (err.message || err));
    }
  };

  return (
    <div className="p-4 bg-white min-h-screen">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold text-orange-600">Hóa đơn</h1>
        {!selectedOrder && (
          <div className="text-sm text-gray-600">
            Trang {pagination.currentPage} / {pagination.totalPages} ({pagination.totalOrders} đơn hàng)
          </div>
        )}
      </div>

      {/* Danh sách orders */}
      {!selectedOrder && (
        <div className="space-y-2">
          {loading ? (
            <div className="text-center py-8 text-gray-500">Đang tải...</div>
          ) : orders.length === 0 ? (
            <div className="text-center py-8 text-gray-500">Không có đơn hàng nào</div>
          ) : (
            orders.map((order) => (
              <div
                key={order._id || order.id}
                onClick={() => handleSelectOrder(order)}
                className="p-3 border rounded-lg hover:bg-orange-50 cursor-pointer flex justify-between items-center"
              >
                <div className="flex flex-col">
                  <span>Bàn {order.tableNumber}</span>
                  <span className="text-xs text-gray-500">
                    Ngày: {new Date(order.createdAt || order.updatedAt || Date.now()).toLocaleDateString()}
                  </span>
                </div>
                <span>{Number(order.totalAmount || 0).toLocaleString()}₫</span>
                <span className={ (order.status || "").includes("Đã thanh toán") ? "text-green-600" : "text-red-500" }>
                  {order.status || "Chưa thanh toán"}
                </span>
              </div>
            ))
          )}
          
          {/* Pagination Controls */}
          {!loading && orders.length > 0 && pagination.totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-6 py-4">
              <button
                onClick={() => handlePageChange(pagination.currentPage - 1)}
                disabled={!pagination.hasPreviousPage}
                className="px-3 py-1 border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-orange-50"
              >
                ← Trước
              </button>
              
              <div className="flex gap-1">
                {/* Show page numbers */}
                {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                  let pageNum;
                  if (pagination.totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (pagination.currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (pagination.currentPage >= pagination.totalPages - 2) {
                    pageNum = pagination.totalPages - 4 + i;
                  } else {
                    pageNum = pagination.currentPage - 2 + i;
                  }
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => handlePageChange(pageNum)}
                      className={`px-3 py-1 border rounded ${
                        pageNum === pagination.currentPage
                          ? "bg-orange-500 text-white"
                          : "hover:bg-orange-50"
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              
              <button
                onClick={() => handlePageChange(pagination.currentPage + 1)}
                disabled={!pagination.hasNextPage}
                className="px-3 py-1 border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-orange-50"
              >
                Sau →
              </button>
            </div>
          )}
        </div>
      )}

      {/* Chi tiết order */}
      {selectedOrder && (
        <div className="space-y-4">
          <button onClick={() => setSelectedOrder(null)} className="text-blue-500">
            ← Quay lại
          </button>
          <h2 className="text-lg font-semibold">Bàn {selectedOrder.tableNumber}</h2>
          <p className="text-sm text-gray-500">
            Ngày: {new Date(selectedOrder.createdAt || selectedOrder.updatedAt || Date.now()).toLocaleDateString()}
          </p>

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
              {(selectedOrder.items || []).map((item, idx) => (
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
                    {isAdmin ? (
                      <input
                        type="number"
                        value={item.price}
                        onChange={(e) => handleChangeItem(idx, "price", e.target.value)}
                        className="w-24 border rounded px-1"
                      />
                    ) : (
                      <span className="w-24 px-1">{Number(item.price).toLocaleString()}₫</span>
                    )}
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
            Tổng: {(selectedOrder.items || []).reduce((sum, i) => sum + (i.quantity || 0) * (i.price || 0), 0).toLocaleString()}₫
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