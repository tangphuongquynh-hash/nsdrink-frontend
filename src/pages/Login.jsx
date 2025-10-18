import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

/**
 * Login page (calls backend POST /api/login)
 * - Request body: { phone, password }
 * - On success the backend returns { phone, name, role }
 * - We store that object to localStorage.currentUser
 */

export default function Login() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const apiBase = "https://nsdrink-backend.onrender.com";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!phone || !password) {
      setError("Vui lòng nhập số điện thoại và mật khẩu.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data?.message || "Đăng nhập thất bại");
        setLoading(false);
        return;
      }

      // store user to localStorage (no token in sample backend)
      localStorage.setItem("currentUser", JSON.stringify(data));
      setLoading(false);
      navigate("/");
    } catch (err) {
      console.error(err);
      setError("Lỗi kết nối tới server.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white p-4">
      <div className="w-full max-w-md bg-gray-800/80 backdrop-blur-md rounded-2xl shadow-lg p-6">
        <h1 className="text-2xl font-bold text-orange-400 mb-4 text-center">NS Drink POS</h1>

        <p className="text-sm text-gray-300 text-center mb-4">Đăng nhập vào hệ thống quản lý</p>

        {error && <div className="bg-red-600/30 text-red-200 p-2 rounded mb-3 text-sm">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="text"
            placeholder="Số điện thoại"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full px-3 py-2 rounded-md bg-gray-700 border border-gray-600 placeholder-gray-400 focus:outline-none"
          />

          <input
            type="password"
            placeholder="Mật khẩu"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 rounded-md bg-gray-700 border border-gray-600 placeholder-gray-400 focus:outline-none"
          />

          <button
            type="submit"
            className="w-full py-2 rounded-md font-semibold bg-gradient-to-r from-orange-500 to-yellow-400 text-gray-900 hover:opacity-95"
            disabled={loading}
          >
            {loading ? "Đang đăng nhập..." : "Đăng nhập"}
          </button>
        </form>

        
      </div>
    </div>
  );
}