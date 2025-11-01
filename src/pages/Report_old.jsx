// src/pages/Report.jsx
import { useState, useEffect } from "react";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { API_ENDPOINTS } from "../config/api";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

function Report() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("all");
  const [orders, setOrders] = useState([]);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalOrders: 0,
    hasNextPage: false,
    hasPreviousPage: false,
    limit: 20
  });
  const [revenue, setRevenue] = useState({
    total: 0,
    cash: 0,
    transfer: 0
  });
  const [chartData, setChartData] = useState({ labels: [], datasets: [] });
  const [loading, setLoading] = useState(false);
  
  // Selected order states (similar to Bills page)
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [paymentMethodEdit, setPaymentMethodEdit] = useState("cash");
  const [discount, setDiscount] = useState(0);
  const [menuItems, setMenuItems] = useState([]);
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [selectedMenuItem, setSelectedMenuItem] = useState("");
  const [newItemQuantity, setNewItemQuantity] = useState(1);
  
  // Get current user for admin check
  const currentUser = JSON.parse(localStorage.getItem("currentUser"));
  const isAdmin = currentUser?.role === "admin";

  // fetch orders with discount or notes with pagination
  const fetchOrders = async (page = 1) => {
    if (!isAdmin) {
      alert("Chỉ admin mới có thể xem báo cáo");
      return;
    }
    
    setLoading(true);
    try {
      // Build query parameters for discount/notes orders
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20'
      });
      
      // Add admin phone for authorization
      if (currentUser?.phone) {
        params.append('phone', currentUser.phone);
      }
      
      const url = `${API_ENDPOINTS.orders}/discount-notes?${params.toString()}`;
      const res = await fetch(url);
      
      if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
      const data = await res.json();
      
      if (data.orders && data.pagination) {
        setOrders(data.orders);
        setPagination(data.pagination);
      } else {
        // Fallback for old API format
        setOrders(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Fetch orders error:", err);
      alert("Lỗi khi tải dữ liệu: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Generate chart data from orders
  const generateChartData = (ordersList) => {
    const itemCount = {};
    ordersList.forEach((order) => {
      (order.items || []).forEach((item) => {
        const name = item.name || "Unknown";
        itemCount[name] = (itemCount[name] || 0) + Number(item.quantity || 0);
      });
    });

    const labels = Object.keys(itemCount).slice(0, 10); // top 10
    const values = labels.map((label) => itemCount[label]);

    setChartData({
      labels,
      datasets: [
        {
          label: "Số lượng",
          data: values,
          backgroundColor: "rgba(255,165,0,0.6)",
          borderColor: "rgba(255,165,0,1)",
          borderWidth: 1,
        },
      ],
    });
  };

  // Handle select order for detailed view
  const handleSelectOrder = (order) => {
    setSelectedOrder(order);
    setPaymentMethodEdit(order.paymentMethod || "cash");
    setDiscount(order.discount || 0);
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

  // Handle table number change
  const handleTableNumberChange = (value) => {
    setSelectedOrder({ ...selectedOrder, tableNumber: value });
  };

  // Handle item changes
  const handleChangeItem = (idx, field, value) => {
    const newItems = [...(selectedOrder.items || [])];
    newItems[idx][field] = field === "quantity" || field === "price" ? Number(value) || 0 : value;
    setSelectedOrder({ ...selectedOrder, items: newItems });
  };

  // Handle remove item
  const handleRemoveItem = (idx) => {
    const newItems = [...(selectedOrder.items || [])];
    newItems.splice(idx, 1);
    setSelectedOrder({ ...selectedOrder, items: newItems });
  };

  // Save changes function
  const handleSaveChanges = async () => {
    if (!selectedOrder) return;
    const id = selectedOrder._id || selectedOrder.id;
    if (!id) return alert("Không tìm thấy id đơn hàng");

    const { total } = calculateTotals(selectedOrder.items, discount);

    const payload = {
      ...selectedOrder,
      paymentMethod: paymentMethodEdit,
      totalAmount: total,
      discount: discount,
      items: selectedOrder.items,
      tableNumber: selectedOrder.tableNumber
    };

    // Add admin phone for authorization
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
        const errorMsg = data?.message || `Lỗi ${res.status}`;
        throw new Error(errorMsg);
      }

      alert("Đã lưu thay đổi!");
      
      // Refresh the order list
      fetchOrders(pagination.currentPage);
      
      // Update selected order with new data
      if (data) {
        setSelectedOrder(data);
      }
    } catch (err) {
      console.error("Save changes error:", err);
      alert("Lỗi khi lưu thay đổi: " + err.message);
    }
  };

  // Complete order function
  const handleComplete = async () => {
    if (!selectedOrder) return;
    const id = selectedOrder._id || selectedOrder.id;
    if (!id) return alert("Không tìm thấy id đơn hàng");

    const { total } = calculateTotals(selectedOrder.items, discount);

    const payload = {
      ...selectedOrder,
      status: "Đã thanh toán",
      paymentMethod: paymentMethodEdit,
      totalAmount: total,
      discount: discount,
    };

    // Add admin phone for authorization
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
        const errorMsg = data?.message || `Lỗi ${res.status}`;
        throw new Error(errorMsg);
      }

      alert("Đã hoàn thành đơn hàng!");
      setSelectedOrder(null); // Go back to list
      fetchOrders(pagination.currentPage); // Refresh list
    } catch (err) {
      console.error("Complete order error:", err);
      alert("Lỗi khi hoàn thành đơn hàng: " + err.message);
    }
  };
  
  // Handle page change
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      fetchOrders(newPage);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchOrders(1);
    }
  }, []);

  const handleFilter = () => {
    fetchOrders(1); // Reset to first page when filtering
  };

  // download CSV
  const downloadCSV = () => {
    let csv = "OrderNumber,TableNumber,DateTime,User,Items,TotalAmount,Status,PaymentMethod\n";
    orders.forEach((o) => {
      const itemsStr = (o.items || [])
        .map((i) => `${i.name || ""}(${i.quantity || 0})`)
        .join(" | ");
      const user = o.createdBy?.name || o.user || o.userName || "-";
      const dateTime = new Date(o.createdAt || o.updatedAt || Date.now()).toLocaleString();
      
      csv += `"${o.orderNumber || ""}","${o.tableNumber || ""}","${dateTime}","${user}","${itemsStr}","${o.totalAmount || 0}","${o.status || ""}","${o.paymentMethod || ""}"\n`;
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `report_${startDate || "all"}_${endDate || "all"}.csv`;
    link.click();
  };
  
  // Return early if not admin
  if (!isAdmin) {
    return (
      <div className="p-4 bg-white min-h-screen">
        <h1 className="text-xl font-bold mb-4 text-orange-600">Báo cáo chi tiết</h1>
        <div className="text-center py-8 text-red-500">
          Chỉ admin mới có thể xem báo cáo
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-white min-h-screen">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold text-orange-600">Báo cáo - Bills có giảm giá/ghi chú</h1>
        {!selectedOrder && (
          <div className="text-sm text-gray-600">
            Trang {pagination.currentPage} / {pagination.totalPages} ({pagination.totalOrders} đơn hàng)
          </div>
        )}
      </div>

      {/* Info notice */}
      {!selectedOrder && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="text-sm text-yellow-700">
            <strong>📋 Hiển thị:</strong> Các đơn hàng có áp dụng giảm giá hoặc có ghi chú đặc biệt
          </div>
        </div>
      )}

      {/* Orders List */}
      {!selectedOrder && (
        <div className="space-y-2">
          {loading ? (
            <div className="text-center py-8 text-gray-500">Đang tải...</div>
          ) : orders.length === 0 ? (
            <div className="text-center py-8 text-gray-500">Không có đơn hàng nào với giảm giá hoặc ghi chú</div>
          ) : (
            orders.map((order) => (
              <div
                key={order._id || order.id}
                onClick={() => handleSelectOrder(order)}
                className="p-3 border rounded-lg hover:bg-orange-50 cursor-pointer"
              >
                <div className="flex justify-between items-center">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Bàn {order.tableNumber}</span>
                      {order.hasDiscount && (
                        <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded">
                          Giảm {order.discount}%
                        </span>
                      )}
                      {order.hasNotes && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                          Có ghi chú
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-gray-500">
                      Ngày: {new Date(order.createdAt || order.updatedAt || Date.now()).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">{Number(order.totalAmount || 0).toLocaleString()}₫</div>
                    <div className={`text-xs ${(order.status || "").includes("Đã thanh toán") ? "text-green-600" : "text-red-500"}`}>
                      {order.status || "Chưa thanh toán"}
                    </div>
                  </div>
                </div>
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

      {/* Selected Order Detail (similar to Bills page) */}
      {selectedOrder && (
        <div className="space-y-4">
          <button onClick={() => setSelectedOrder(null)} className="text-blue-500">
            ← Quay lại danh sách
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
            <div className="ml-4 flex items-center gap-2">
              {selectedOrder.hasDiscount && (
                <span className="px-2 py-1 bg-red-100 text-red-700 text-sm rounded">
                  Giảm giá: {selectedOrder.discount}%
                </span>
              )}
              {selectedOrder.hasNotes && (
                <span className="px-2 py-1 bg-blue-100 text-blue-700 text-sm rounded">
                  Có ghi chú
                </span>
              )}
            </div>
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
                <th className="p-2">Thao tác</th>
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
                    <input
                      type="number"
                      value={item.price}
                      onChange={(e) => handleChangeItem(idx, "price", e.target.value)}
                      className="w-24 border rounded px-1"
                      min="0"
                    />
                  </td>
                  <td className="p-2">
                    <input
                      type="text"
                      value={item.note || ""}
                      onChange={(e) => handleChangeItem(idx, "note", e.target.value)}
                      className="border rounded px-1 w-full"
                      placeholder="Ghi chú..."
                    />
                  </td>
                  <td className="p-2">
                    <button
                      onClick={() => handleRemoveItem(idx)}
                      className="bg-red-500 text-white px-2 py-1 rounded text-xs hover:bg-red-600"
                      title="Xóa món này"
                    >
                      🗑️ Xóa
                    </button>
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
                checked={paymentMethodEdit === "cash"}
                onChange={() => setPaymentMethodEdit("cash")}
              />{" "}
              Tiền mặt
            </label>
            <label>
              <input
                type="radio"
                name="payment"
                value="transfer"
                checked={paymentMethodEdit === "transfer"}
                onChange={() => setPaymentMethodEdit("transfer")}
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

          <div className="flex flex-col gap-2 mt-4">
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
    </div>
  );
}

export default Report;
            onClick={handleFilter}
            disabled={loading}
            className="bg-orange-500 text-white px-4 py-2 rounded shadow hover:bg-orange-600 disabled:opacity-50"
          >
            {loading ? "Đang tải..." : "Lọc"}
          </button>
          <button
            onClick={downloadCSV}
            disabled={loading || orders.length === 0}
            className="bg-green-500 text-white px-4 py-2 rounded shadow hover:bg-green-600 disabled:opacity-50"
          >
            Tải CSV
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <div className="text-sm text-blue-600 font-medium">Tổng đơn hàng</div>
          <div className="text-2xl font-bold text-blue-700">{pagination.totalOrders}</div>
          <div className="text-xs text-blue-500 mt-1">
            Trang {pagination.currentPage}/{pagination.totalPages}
          </div>
        </div>
        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <div className="text-sm text-green-600 font-medium">Tổng doanh thu</div>
          <div className="text-2xl font-bold text-green-700">{revenue.total.toLocaleString()} VNĐ</div>
          <div className="text-xs text-green-500 mt-1">Đã thanh toán</div>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
          <div className="text-sm text-purple-600 font-medium">Tiền mặt</div>
          <div className="text-2xl font-bold text-purple-700">{revenue.cash.toLocaleString()} VNĐ</div>
          <div className="text-xs text-purple-500 mt-1">
            {revenue.total > 0 ? Math.round((revenue.cash / revenue.total) * 100) : 0}% tổng doanh thu
          </div>
        </div>
        <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-200">
          <div className="text-sm text-indigo-600 font-medium">Chuyển khoản</div>
          <div className="text-2xl font-bold text-indigo-700">{revenue.transfer.toLocaleString()} VNĐ</div>
          <div className="text-xs text-indigo-500 mt-1">
            {revenue.total > 0 ? Math.round((revenue.transfer / revenue.total) * 100) : 0}% tổng doanh thu
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-lg shadow-sm border border-orange-100 overflow-hidden mb-6">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-orange-100 text-orange-700">
                <th className="p-3 text-left border-b">Order #</th>
                <th className="p-3 text-left border-b">Bàn</th>
                <th className="p-3 text-left border-b">Ngày giờ</th>
                <th className="p-3 text-left border-b">Người tạo</th>
                <th className="p-3 text-left border-b">Trạng thái</th>
                <th className="p-3 text-left border-b">Items</th>
                <th className="p-3 text-right border-b">Tổng tiền</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" className="p-8 text-center text-gray-500">
                    Đang tải dữ liệu...
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan="7" className="p-8 text-center text-gray-500">
                    Không có đơn hàng nào trong khoảng thời gian này
                  </td>
                </tr>
              ) : (
                orders.map((o, idx) => (
                  <tr key={o._id || idx} className="border-b hover:bg-orange-25 transition-colors">
                    <td className="p-3">{o.orderNumber || "-"}</td>
                    <td className="p-3">{o.tableNumber || "-"}</td>
                    <td className="p-3">
                      {new Date(o.createdAt || o.updatedAt || Date.now()).toLocaleString("vi-VN")}
                    </td>
                    <td className="p-3">
                      {o.createdBy?.name || o.user || o.userName || "-"}
                    </td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          (o.status || "").includes("Đã thanh toán")
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {o.status || "Chưa xác định"}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="max-w-xs">
                        {(o.items || []).map((i, itemIdx) => (
                          <div key={itemIdx} className="text-xs mb-1">
                            <span className="font-medium">{i.name || "Unknown"}</span>
                            <span className="text-gray-500"> x{i.quantity || 0}</span>
                            <span className="text-gray-600"> ({Number(i.price || 0).toLocaleString()}₫)</span>
                            {i.note && <span className="text-gray-400 italic"> - {i.note}</span>}
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="p-3 text-right font-medium">
                      <div>{Number(o.totalAmount || 0).toLocaleString()} VNĐ</div>
                      {o.paymentMethod && (
                        <div className="text-xs text-gray-500 mt-1">
                          {o.paymentMethod === 'cash' ? '💵 Tiền mặt' : 
                           o.paymentMethod === 'transfer' ? '💳 Chuyển khoản' : 
                           o.paymentMethod}
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Controls */}
        {!loading && orders.length > 0 && pagination.totalPages > 1 && (
          <div className="flex justify-center items-center gap-2 mt-4 py-4">
            <button
              onClick={() => handlePageChange(pagination.currentPage - 1)}
              disabled={!pagination.hasPreviousPage}
              className="px-3 py-1 border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-orange-50"
            >
              ← Trước
            </button>
            
            <div className="flex gap-1">
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

      {/* Chart Section */}
      {chartData.labels.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-orange-100 p-4">
          <h2 className="text-lg font-semibold mb-4 text-gray-700">
            Top 10 món được order nhiều nhất
            {(startDate || endDate) && (
              <span className="text-sm font-normal text-gray-500">
                {" "}(từ {startDate || "đầu"} đến {endDate || "hiện tại"})
              </span>
            )}
          </h2>
          <div style={{ height: "400px" }}>
            <Bar
              data={chartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: "top",
                  },
                  title: {
                    display: false,
                  },
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    ticks: {
                      stepSize: 1,
                    },
                  },
                },
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default Report;
