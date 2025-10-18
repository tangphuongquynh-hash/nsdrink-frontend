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
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [sumAmount, setSumAmount] = useState(0);
  const [paidAmount, setPaidAmount] = useState(0);
  const [chartData, setChartData] = useState({ labels: [], datasets: [] });
  const [loading, setLoading] = useState(false);

  // fetch tất cả orders
  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await fetch(API_ENDPOINTS.orders);
      if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
      const data = await res.json();
      setOrders(Array.isArray(data) ? data : []);
      filterOrders(data);
    } catch (err) {
      console.error("Fetch orders error:", err);
      alert("Lỗi khi tải dữ liệu: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // filter orders theo khoảng thời gian
  const filterOrders = (allOrders = orders) => {
    let filtered = allOrders;

    if (startDate || endDate) {
      filtered = allOrders.filter((order) => {
        const orderDate = new Date(order.createdAt || order.updatedAt || Date.now());
        const orderDateStr = orderDate.toISOString().split("T")[0];

        if (startDate && orderDateStr < startDate) return false;
        if (endDate && orderDateStr > endDate) return false;
        return true;
      });
    }

    setFilteredOrders(filtered);

    // tính tổng tiền (tất cả đơn)
    const totalSum = filtered.reduce((s, o) => s + Number(o.totalAmount || 0), 0);
    setSumAmount(totalSum);

    // tính tổng tiền đã thanh toán
    const paidOrders = filtered.filter((o) => {
      const status = (o.status || "").toString();
      return status.includes("Đã thanh toán") || /paid/i.test(status);
    });
    const paidSum = paidOrders.reduce((s, o) => s + Number(o.totalAmount || 0), 0);
    setPaidAmount(paidSum);

    // tính món order nhiều nhất
    const itemCount = {};
    filtered.forEach((order) => {
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

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleFilter = () => {
    filterOrders();
  };

  // download CSV
  const downloadCSV = () => {
    let csv = "OrderNumber,TableNumber,DateTime,User,Items,TotalAmount,Status,PaymentMethod\n";
    filteredOrders.forEach((o) => {
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
          <button
            onClick={handleFilter}
            disabled={loading}
            className="bg-orange-500 text-white px-4 py-2 rounded shadow hover:bg-orange-600 disabled:opacity-50"
          >
            {loading ? "Đang tải..." : "Lọc"}
          </button>
          <button
            onClick={downloadCSV}
            disabled={loading || filteredOrders.length === 0}
            className="bg-green-500 text-white px-4 py-2 rounded shadow hover:bg-green-600 disabled:opacity-50"
          >
            Tải CSV
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <div className="text-sm text-blue-600 font-medium">Tổng đơn hàng</div>
          <div className="text-2xl font-bold text-blue-700">{filteredOrders.length}</div>
        </div>
        <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
          <div className="text-sm text-yellow-600 font-medium">Tổng tiền (tất cả)</div>
          <div className="text-2xl font-bold text-yellow-700">{sumAmount.toLocaleString()} VNĐ</div>
        </div>
        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <div className="text-sm text-green-600 font-medium">Tổng tiền đã thanh toán</div>
          <div className="text-2xl font-bold text-green-700">{paidAmount.toLocaleString()} VNĐ</div>
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
              {filteredOrders.map((o, idx) => (
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
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className="p-3 text-right font-medium">
                    {Number(o.totalAmount || 0).toLocaleString()} VNĐ
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {filteredOrders.length === 0 && !loading && (
          <div className="p-8 text-center text-gray-500">
            Không có đơn hàng nào trong khoảng thời gian này
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
