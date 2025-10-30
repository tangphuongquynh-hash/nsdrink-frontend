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
  
  // Get current user for admin check
  const currentUser = JSON.parse(localStorage.getItem("currentUser"));
  const isAdmin = currentUser?.role === "admin";

  // fetch completed orders with pagination and filters
  const fetchOrders = async (page = 1) => {
    if (!isAdmin) {
      alert("Chỉ admin mới có thể xem báo cáo");
      return;
    }
    
    setLoading(true);
    try {
      // Build query parameters
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20'
      });
      
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (paymentMethod && paymentMethod !== 'all') params.append('paymentMethod', paymentMethod);
      
      // Add admin phone for authorization
      if (currentUser?.phone) {
        params.append('phone', currentUser.phone);
      }
      
      const url = `${API_ENDPOINTS.orders}/completed?${params.toString()}`;
      const res = await fetch(url);
      
      if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
      const data = await res.json();
      
      if (data.orders && data.pagination && data.revenue) {
        setOrders(data.orders);
        setPagination(data.pagination);
        setRevenue(data.revenue);
        generateChartData(data.orders);
      } else {
        // Fallback for old API format
        setOrders(Array.isArray(data) ? data : []);
        generateChartData(Array.isArray(data) ? data : []);
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
      <h1 className="text-xl font-bold mb-4 text-orange-600">Báo cáo chi tiết</h1>

      {/* Filter Section */}
      <div className="bg-orange-50 p-4 rounded-lg mb-4">
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-sm font-semibold mb-1">Từ ngày</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="border px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-orange-300"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Đến ngày</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="border px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-orange-300"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Phương thức thanh toán</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="border px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-orange-300"
            >
              <option value="all">Tất cả</option>
              <option value="cash">Tiền mặt</option>
              <option value="transfer">Chuyển khoản</option>
            </select>
          </div>
          <button
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
