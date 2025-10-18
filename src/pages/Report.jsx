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

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const API_BASE = "https://nsdrink-backend.onrender.com/api";

function Report() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [orders, setOrders] = useState([]);
  const [sumAmount, setSumAmount] = useState(0);
  const [chartData, setChartData] = useState({ labels: [], datasets: [] });

  // fetch orders theo filter
  const fetchOrders = async () => {
    try {
      let url = `${API_BASE}/orders`;
      if (startDate && endDate) url += `?startDate=${startDate}&endDate=${endDate}`;
      const res = await fetch(url);
      const data = await res.json();
      setOrders(data);

      // tính tổng tiền
      const sum = data.reduce((s, o) => s + (o.totalAmount || 0), 0);
      setSumAmount(sum);

      // tính món order nhiều nhất
      const itemCount = {};
      data.forEach((order) => {
        order.items.forEach((item) => {
          itemCount[item.name] = (itemCount[item.name] || 0) + item.quantity;
        });
      });

      setChartData({
        labels: Object.keys(itemCount),
        datasets: [
          {
            label: "Số lượng",
            data: Object.values(itemCount),
            backgroundColor: "rgba(255,165,0,0.6)",
          },
        ],
      });
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  // download CSV
  const downloadCSV = () => {
    let csv = "OrderNumber,TableNumber,DateTime,User,Items,TotalAmount\n";
    orders.forEach((o) => {
      const itemsStr = o.items.map((i) => `${i.name}(${i.quantity})`).join(" | ");
      csv += `${o.orderNumber},${o.tableNumber},${new Date(o.createdAt).toLocaleString()},${o.user || ""},"${itemsStr}",${o.totalAmount}\n`;
    });
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `report_${startDate || "all"}_${endDate || "all"}.csv`;
    link.click();
  };

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4 text-orange-600">Báo cáo chi tiết</h1>

      <div className="flex gap-2 mb-4 items-end">
        <div>
          <label className="block text-sm font-semibold">Từ ngày</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="border px-2 py-1 rounded"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold">Đến ngày</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="border px-2 py-1 rounded"
          />
        </div>
        <button
          onClick={fetchOrders}
          className="bg-orange-500 text-white px-4 py-2 rounded shadow"
        >
          Lọc
        </button>
        <button
          onClick={downloadCSV}
          className="bg-green-500 text-white px-4 py-2 rounded shadow"
        >
          Tải CSV
        </button>
      </div>

      <div className="mb-4 font-semibold">Tổng tiền: {sumAmount.toLocaleString()} VNĐ</div>

      <div className="overflow-x-auto">
        <table className="w-full border border-orange-200 text-sm">
          <thead>
            <tr className="bg-orange-100 text-orange-700">
              <th className="p-2 border">Order #</th>
              <th className="p-2 border">Bàn</th>
              <th className="p-2 border">Ngày giờ</th>
              <th className="p-2 border">Người tạo</th>
              <th className="p-2 border">Items</th>
              <th className="p-2 border">Tổng tiền</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o._id} className="border-t hover:bg-orange-50">
                <td className="p-2 border">{o.orderNumber}</td>
                <td className="p-2 border">{o.tableNumber}</td>
                <td className="p-2 border">{new Date(o.createdAt).toLocaleString()}</td>
                <td className="p-2 border">{o.user || "-"}</td>
                <td className="p-2 border">
                  {o.items.map((i) => (
                    <div key={i.name}>
                      {i.name} x{i.quantity} ({i.price.toLocaleString()} VNĐ)
                    </div>
                  ))}
                </td>
                <td className="p-2 border">{o.totalAmount.toLocaleString()} VNĐ</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6">
        <h2 className="text-lg font-semibold mb-2">Món order nhiều nhất trong khoảng thời gian</h2>
        <Bar data={chartData} />
      </div>
    </div>
  );
}

export default Report;
