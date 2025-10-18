// src/Pages/Home.jsx
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import BottomNav from "../components/BottomNav";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

const API_BASE = "https://nsdrink-backend.onrender.com/api";

export default function Home() {
  const [currentUser, setCurrentUser] = useState(null);
  const [todayRevenue, setTodayRevenue] = useState({
    total: 0,
    cash: 0,
    card: 0,
  });
  const [weeklyRevenue, setWeeklyRevenue] = useState([]);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("currentUser"));
    setCurrentUser(user || { name: "Guest" });

    fetch(`${API_BASE}/orders`)
      .then((res) => res.json())
      .then((orders) => {
        const today = new Date().toISOString().split("T")[0];

        let total = 0,
          cash = 0,
          card = 0;
        const weekData = [];

        for (let i = 6; i >= 0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          const day = d.toISOString().split("T")[0];

          const dayOrders = orders.filter(
            (o) =>
              o.status === "Đã thanh toán" &&
              new Date(o.createdAt).toISOString().split("T")[0] === day
          );

          const dayTotal = dayOrders.reduce((sum, o) => sum + o.totalAmount, 0);
          weekData.push({ day: day.slice(5), total: dayTotal }); // MM-DD

          if (day === today) {
            total = dayTotal;
            cash = dayOrders
              .filter((o) => o.paymentMethod === "cash")
              .reduce((s, o) => s + o.totalAmount, 0);
            card = dayOrders
              .filter((o) => o.paymentMethod === "transfer")
              .reduce((s, o) => s + o.totalAmount, 0);
          }
        }

        setTodayRevenue({ total, cash, card });
        setWeeklyRevenue(weekData);
      })
      .catch((err) => console.log("Fetch orders error:", err));
  }, []);

  return (
    <div className="min-h-screen pb-20 bg-gradient-to-br from-orange-50 to-yellow-50">
      {/* Header */}
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <h1 className="text-2xl font-bold text-orange-600">NS Drink POS</h1>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 mt-2 sm:mt-0">
            <span className="text-gray-700 text-sm">
              Xin chào, {currentUser?.name || "Guest"}
            </span>
            <button
              onClick={() => {
                localStorage.removeItem("currentUser");
                window.location.href = "/login";
              }}
              className="text-red-500 text-sm font-semibold hover:underline"
            >
              Đăng xuất
            </button>
          </div>
        </div>
      </header>

      {/* Card Doanh thu hôm nay */}
      <section className="p-4">
        <div className="bg-gradient-to-br from-orange-100 to-yellow-100 rounded-xl shadow-md p-4">
          <h2 className="text-lg font-semibold text-orange-700 mb-2">Doanh thu hôm nay</h2>
          <p className="text-2xl font-bold text-orange-600">
            {todayRevenue.total.toLocaleString()} VNĐ
          </p>
          <div className="flex justify-between mt-2 text-sm text-gray-700">
            <span>Tiền mặt: {todayRevenue.cash.toLocaleString()} VNĐ</span>
            <span>Chuyển khoản: {todayRevenue.card.toLocaleString()} VNĐ</span>
          </div>
        </div>
      </section>

      {/* Section Tính năng */}
      <section className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { key: "stock", title: "Quản lý kho", emoji: "📦", link: "/stock" },
          { key: "menu", title: "Menu", emoji: "📋", link: "/menu" },
          { key: "orders", title: "Đơn hàng", emoji: "🧾", link: "/orders" },
          { key: "report", title: "Báo cáo", emoji: "📊", link: "/report" },
        ].map((item) => (
          <Link
            key={item.key}
            to={item.link}
            className="bg-white rounded-xl shadow-md p-4 flex flex-col items-center justify-center hover:shadow-lg transition"
          >
            <div className="text-4xl mb-2">{item.emoji}</div>
            <p className="text-sm font-semibold text-gray-700 text-center">{item.title}</p>
          </Link>
        ))}
      </section>

      {/* Biểu đồ doanh thu 7 ngày */}
      <section className="p-4">
        <div className="bg-white rounded-xl shadow-md p-4">
          <h2 className="text-lg font-semibold text-gray-700 mb-2">Doanh thu 7 ngày gần nhất</h2>
          <div style={{ width: "100%", height: 250 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={weeklyRevenue}
                layout="vertical"
                margin={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="day" type="category" />
                <Tooltip />
                <Bar dataKey="total" fill="#f97316" radius={[5, 5, 5, 5]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* BottomNav */}
      <BottomNav />
    </div>
  );
}
