// src/Pages/NewOrder.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Minus, Trash2 } from "lucide-react";

const API = import.meta.env.VITE_API_BASE || "http://localhost:5001/api";

export default function NewOrder() {
  const navigate = useNavigate();
  const [menu, setMenu] = useState([]);
  const [search, setSearch] = useState("");
  const [table, setTable] = useState(1);
  const [items, setItems] = useState([]);
  const [orderNumber, setOrderNumber] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [saving, setSaving] = useState(false);

  // load menu + last order to compute orderNumber
  useEffect(() => {
    fetchMenu();
    fetchLastOrder();
  }, []);

  async function fetchMenu() {
    try {
      const res = await fetch(`${API}/menu`);
      const data = await res.json();
      setMenu(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("fetch menu", err);
    }
  }

  async function fetchLastOrder() {
    try {
      const res = await fetch(`${API}/orders/last`);
      const last = await res.json(); // null or object
      const now = new Date();
      const month = now.getMonth() + 1;
      let next = 1;
      if (last && last.orderNumber && last.month === month) {
        next = last.orderNumber + 1;
      }
      setOrderNumber(next);
    } catch (err) {
      console.error(err);
      setOrderNumber(1);
    }
  }

  function filteredMenu() {
    if (!search) return menu;
    const q = search.toLowerCase();
    return menu.filter((m) => m.name.toLowerCase().includes(q));
  }

  function addItem(menuItem) {
    const found = items.find((it) => it.name === menuItem.name && it.price === menuItem.price);
    if (found) {
      setItems(items.map((it) => it === found ? { ...it, quantity: it.quantity + 1 } : it));
    } else {
      setItems([...items, { name: menuItem.name, price: Number(menuItem.price), quantity: 1 }]);
    }
  }

  function changeQty(index, delta) {
    setItems((cur) => {
      const copy = [...cur];
      copy[index].quantity = Math.max(1, copy[index].quantity + delta);
      return copy;
    });
  }

  function removeItem(index) {
    setItems((cur) => cur.filter((_, i) => i !== index));
  }

  const subtotal = items.reduce((s, it) => s + it.price * it.quantity, 0);

  async function handleSubmitOrder() {
    if (items.length === 0) return alert("Vui lòng chọn món trước khi gửi.");
    setShowReview(true);
  }

  async function confirmOrder() {
    // build payload
    const payload = {
      orderNumber,
      tableNumber: Number(table),
      items,
    };
    setSaving(true);
    try {
      const res = await fetch(`${API}/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err?.message || "Gửi order thất bại");
        setSaving(false);
        return;
      }
      const saved = await res.json();
      alert(`Đã tạo order #${saved.orderNumber}`);
      // reset
      setItems([]);
      setOrderNumber((prev) => (prev || 1) + 1);
      setShowReview(false);
      navigate("/orders"); // or go home
    } catch (err) {
      console.error(err);
      alert("Lỗi kết nối server");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen pb-24 p-4 bg-gradient-to-br from-orange-50 to-yellow-50">
      <div className="max-w-3xl mx-auto">
        <header className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-orange-600">Tạo Order mới</h1>
            <div className="text-sm text-gray-600">Order #{orderNumber ?? "..."}</div>
          </div>
          <div className="text-sm text-gray-600">Bàn: 
            <select
              value={table}
              onChange={(e) => setTable(e.target.value)}
              className="ml-2 p-1 rounded border"
            >
              {Array.from({ length: 20 }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Left: menu + search */}
          <div>
            <div className="mb-2">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm món..."
                className="w-full p-2 border rounded"
              />
            </div>

            <div className="h-96 overflow-auto border rounded p-2 bg-white">
              {filteredMenu().length === 0 ? (
                <div className="text-gray-500">Không tìm thấy món</div>
              ) : (
                filteredMenu().map((m) => (
                  <div
                    key={m._id || m.name}
                    className="flex justify-between items-center p-2 hover:bg-gray-50 rounded cursor-pointer"
                    onClick={() => addItem(m)}
                  >
                    <div>
                      <div className="font-medium">{m.name}</div>
                      <div className="text-sm text-gray-500">{Number(m.price).toLocaleString()} VNĐ</div>
                    </div>
                    <div className="text-orange-600 font-semibold">Thêm</div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right: cart */}
          <div>
            <div className="bg-white rounded-lg p-2 shadow mb-3">
              <h3 className="font-semibold">Đơn hàng</h3>
              <div className="text-sm text-gray-500">Món đã chọn</div>
            </div>

            <div className="bg-white rounded-lg p-2 shadow">
              {items.length === 0 ? (
                <div className="text-gray-500 p-4">Chưa có món nào</div>
              ) : (
                <div className="space-y-2">
                  {items.map((it, idx) => (
                    <div key={idx} className="flex items-center justify-between border-b pb-2">
                      <div>
                        <div className="font-medium">{it.name}</div>
                        <div className="text-sm text-gray-500">{Number(it.price).toLocaleString()} VNĐ</div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button onClick={() => changeQty(idx, -1)} className="p-1 rounded border"><Minus size={14} /></button>
                        <div className="w-6 text-center">{it.quantity}</div>
                        <button onClick={() => changeQty(idx, +1)} className="p-1 rounded border"><Plus size={14} /></button>

                        <div className="w-20 text-right font-semibold">{(it.price * it.quantity).toLocaleString()}đ</div>

                        <button onClick={() => removeItem(idx)} className="ml-2 text-red-500 p-1" title="Xóa">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-4 flex justify-between items-center">
                <div className="text-lg font-semibold">Tổng: {subtotal.toLocaleString()} VNĐ</div>
                <div className="flex gap-2">
                  <button
                    onClick={handleSubmitOrder}
                    className="px-4 py-2 bg-gradient-to-r from-orange-500 to-yellow-400 text-gray-900 rounded-md font-semibold"
                    disabled={items.length === 0}
                  >
                    Review
                  </button>
                  <button
                    onClick={() => { setItems([]); }}
                    className="px-4 py-2 border rounded-md"
                  >
                    Xóa hết
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Review modal */}
        {showReview && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg w-full max-w-xl p-4">
              <h3 className="text-lg font-semibold mb-2">Xác nhận đơn hàng</h3>
              <div className="text-sm text-gray-600 mb-3">Order #{orderNumber} — Bàn {table}</div>

              <div className="space-y-2 max-h-60 overflow-auto">
                {items.map((it, i) => (
                  <div key={i} className="flex justify-between">
                    <div>
                      <div className="font-medium">{it.name}</div>
                      <div className="text-sm text-gray-500">{it.quantity} x {Number(it.price).toLocaleString()}đ</div>
                    </div>
                    <div className="font-semibold">{(it.price * it.quantity).toLocaleString()}đ</div>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex justify-between items-center">
                <div className="text-lg font-bold">Tổng: {subtotal.toLocaleString()} VNĐ</div>
                <div className="flex gap-2">
                  <button onClick={() => setShowReview(false)} className="px-4 py-2 border rounded-md">Điều chỉnh</button>
                  <button onClick={confirmOrder} disabled={saving} className="px-4 py-2 bg-gradient-to-r from-orange-500 to-yellow-400 text-gray-900 rounded-md">
                    {saving ? "Đang gửi..." : "Xác nhận"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}