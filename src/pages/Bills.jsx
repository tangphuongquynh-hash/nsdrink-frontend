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
  const [menuItems, setMenuItems] = useState([]);
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [selectedMenuItem, setSelectedMenuItem] = useState("");
  const [newItemQuantity, setNewItemQuantity] = useState(1);
  const [discount, setDiscount] = useState(0); // Discount percentage (0, 5, 10, 15, 20)
  
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

  // Lấy danh sách menu items cho admin
  const fetchMenuItems = async () => {
    if (!isAdmin) return;
    
    try {
      const res = await fetch(API_ENDPOINTS.menu);
      const data = await res.json();
      setMenuItems(Array.isArray(data) ? data : []);
    } catch (err) {
      console.log("Fetch menu items error:", err);
    }
  };

  useEffect(() => {
    fetchOrders(1);
    if (isAdmin) {
      fetchMenuItems();
    }

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
    setDiscount(order.discount || 0);
  };

  const handleChangeItem = (index, key, value) => {
    const newItems = [...(selectedOrder.items || [])];
    newItems[index] = { ...newItems[index], [key]: key === "quantity" || key === "price" ? Number(value) : value };
    setSelectedOrder({ ...selectedOrder, items: newItems });
  };

  // Handle table number change
  const handleTableNumberChange = (value) => {
    setSelectedOrder({ ...selectedOrder, tableNumber: value });
  };

  // Calculate totals with discount
  const calculateTotals = (items, discountPercentage = 0) => {
    const subtotal = (items || []).reduce((sum, i) => sum + (i.quantity || 0) * (i.price || 0), 0);
    const discountAmount = subtotal * (discountPercentage / 100);
    const total = subtotal - discountAmount;
    return { subtotal, discountAmount, total };
  };

  // Handle discount change
  const handleDiscountChange = (discountPercentage) => {
    setDiscount(discountPercentage);
  };

  // Thêm món mới vào đơn hàng (chỉ admin)
  const handleAddItem = () => {
    if (!isAdmin || !selectedMenuItem) return;
    
    const menuItem = menuItems.find(item => item._id === selectedMenuItem);
    if (!menuItem) return;
    
    const newItem = {
      name: menuItem.name,
      price: menuItem.price,
      quantity: newItemQuantity,
      note: ""
    };
    
    const updatedItems = [...(selectedOrder.items || []), newItem];
    setSelectedOrder({ ...selectedOrder, items: updatedItems });
    
    // Reset form
    setSelectedMenuItem("");
    setNewItemQuantity(1);
    setShowAddItemModal(false);
  };

  // Xóa món khỏi đơn hàng (chỉ admin)
  const handleRemoveItem = (index) => {
    if (!isAdmin) return;
    
    const confirmDelete = window.confirm("Bạn có chắc muốn xóa món này khỏi đơn hàng?");
    if (!confirmDelete) return;
    
    const newItems = [...(selectedOrder.items || [])];
    newItems.splice(index, 1);
    setSelectedOrder({ ...selectedOrder, items: newItems });
  };

  // Save changes without completing order
  const handleSaveChanges = async () => {
    if (!selectedOrder) return;
    const id = selectedOrder._id || selectedOrder.id;
    if (!id) return alert("Không tìm thấy id đơn hàng");

    const { subtotal, total } = calculateTotals(selectedOrder.items, discount);

    const payload = {
      ...selectedOrder,
      totalAmount: total,
      discount: discount,
      items: selectedOrder.items,
      tableNumber: selectedOrder.tableNumber
    };

    // Thêm thông tin user cho middleware
    if (currentUser?.phone) {
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
        throw new Error((data && (data.message || data.error)) || `Save failed (${res.status})`);
      }

      // Update local state
      const updated = data && (data._id || data.id) ? data : payload;
      setOrders((prev) => prev.map((o) => ((o._id || o.id) === (updated._id || updated.id) ? updated : o)));
      
      alert("Lưu thay đổi thành công!");
    } catch (err) {
      console.error("Save changes error:", err);
      alert("Lưu thất bại: " + (err.message || err));
    }
  };

  const handleComplete = async () => {
    if (!selectedOrder) return;
    const id = selectedOrder._id || selectedOrder.id;
    if (!id) return alert("Không tìm thấy id đơn hàng");

    const { total } = calculateTotals(selectedOrder.items, discount);

    const payload = {
      ...selectedOrder,
      status: "Đã thanh toán",
      paymentMethod,
      totalAmount: total,
      discount: discount,
    };

    // Thêm thông tin user (cả admin và user thường) cho middleware
    if (currentUser?.phone) {
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
          
          <div className="flex items-center gap-2">
            <span className="text-lg font-semibold">Bàn</span>
            <input
              type="text"
              value={selectedOrder.tableNumber || ""}
              onChange={(e) => handleTableNumberChange(e.target.value)}
              className="border border-gray-300 rounded px-2 py-1 w-20 text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-orange-300"
              placeholder="Số bàn"
            />
          </div>
          
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
                {isAdmin && <th className="p-2">Thao tác</th>}
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
                      min="0"
                    />
                  </td>
                  <td className="p-2">
                    {isAdmin ? (
                      <input
                        type="number"
                        value={item.price}
                        onChange={(e) => handleChangeItem(idx, "price", e.target.value)}
                        className="w-24 border rounded px-1"
                        min="0"
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
                      placeholder="Ghi chú..."
                    />
                  </td>
                  {isAdmin && (
                    <td className="p-2">
                      <button
                        onClick={() => handleRemoveItem(idx)}
                        className="bg-red-500 text-white px-2 py-1 rounded text-xs hover:bg-red-600"
                        title="Xóa món này"
                      >
                        🗑️ Xóa
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>

          {/* Add Item Button for Admin */}
          {isAdmin && (
            <div className="mt-4">
              <button
                onClick={() => setShowAddItemModal(true)}
                className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
              >
                ➕ Thêm món
              </button>
            </div>
          )}

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

          {/* Discount Section */}
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h3 className="text-sm font-semibold text-yellow-700 mb-2">Giảm giá</h3>
            <div className="flex flex-wrap gap-2">
              {[0, 5, 10, 15, 20].map((percentage) => (
                <button
                  key={percentage}
                  onClick={() => handleDiscountChange(percentage)}
                  className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                    discount === percentage
                      ? "bg-yellow-500 text-white"
                      : "bg-white border border-yellow-300 text-yellow-700 hover:bg-yellow-100"
                  }`}
                >
                  {percentage === 0 ? "Không giảm" : `${percentage}%`}
                </button>
              ))}
            </div>
          </div>

          {/* Total Calculation Display */}
          {(() => {
            const totals = calculateTotals(selectedOrder.items, discount);
            return (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-600">Tạm tính:</span>
                  <span className="text-sm font-medium">{totals.subtotal.toLocaleString('vi-VN')}đ</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-red-600">Giảm giá ({discount}%):</span>
                    <span className="text-sm font-medium text-red-600">-{totals.discountAmount.toLocaleString('vi-VN')}đ</span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-2 border-t border-blue-200">
                  <span className="text-base font-semibold text-blue-700">Tổng cộng:</span>
                  <span className="text-lg font-bold text-blue-700">{totals.total.toLocaleString('vi-VN')}đ</span>
                </div>
              </div>
            );
          })()}

          <div className="mt-4 font-semibold">
            Tổng: {(selectedOrder.items || []).reduce((sum, i) => sum + (i.quantity || 0) * (i.price || 0), 0).toLocaleString()}₫
          </div>

          <div className="flex flex-col gap-2 mt-2">
            <button
              onClick={handleSaveChanges}
              className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
            >
              Lưu thay đổi
            </button>
            <button
              onClick={handleComplete}
              className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors"
            >
              Hoàn thành
            </button>
          </div>
        </div>
      )}

      {/* Add Item Modal */}
      {showAddItemModal && isAdmin && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Thêm món vào đơn hàng</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Chọn món:</label>
                <select
                  value={selectedMenuItem}
                  onChange={(e) => setSelectedMenuItem(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Chọn món --</option>
                  {menuItems.map((item) => (
                    <option key={item._id || item.id} value={item._id || item.id}>
                      {item.name} - {Number(item.price || 0).toLocaleString()}₫
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Số lượng:</label>
                <input
                  type="number"
                  value={newItemQuantity}
                  onChange={(e) => setNewItemQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="1"
                />
              </div>
            </div>
            
            <div className="flex gap-2 mt-6">
              <button
                onClick={handleAddItem}
                disabled={!selectedMenuItem}
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Thêm món
              </button>
              <button
                onClick={() => {
                  setShowAddItemModal(false);
                  setSelectedMenuItem("");
                  setNewItemQuantity(1);
                }}
                className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Bills;