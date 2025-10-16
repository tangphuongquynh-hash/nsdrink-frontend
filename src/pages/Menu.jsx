import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

/**
 * Menu management page (admin only)
 * - GET /api/menu
 * - POST /api/menu        -> create
 * - PUT  /api/menu/:id    -> update
 * - DELETE /api/menu/:id  -> delete
 *
 * This page expects backend running at https://ns-drink-pos.onrender.com
 */

export default function Menu() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [menu, setMenu] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [editId, setEditId] = useState(null);
  const [error, setError] = useState("");

  const apiBase = "https://ns-drink-pos.onrender.com/api";

  useEffect(() => {
    const cu = JSON.parse(localStorage.getItem("currentUser"));
    setCurrentUser(cu);
    if (!cu || cu.role !== "admin") {
      // not admin -> redirect to home
      navigate("/");
      return;
    }
    fetchMenu();
    // eslint-disable-next-line
  }, [navigate]);

  async function fetchMenu() {
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/menu`);
      const data = await res.json();
      setMenu(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setError("Không thể tải danh sách menu.");
    } finally {
      setLoading(false);
    }
  }

  const resetForm = () => {
    setName("");
    setPrice("");
    setEditId(null);
    setError("");
  };

  const handleEdit = (item) => {
    setEditId(item._id);
    setName(item.name);
    setPrice(String(item.price));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id) => {
    if (!confirm("Xác nhận xóa món này?")) return;
    try {
      setSaving(true);
      const res = await fetch(`${apiBase}/menu/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err?.message || "Xóa thất bại");
      } else {
        await fetchMenu();
      }
    } catch (err) {
      console.error(err);
      alert("Lỗi xóa món");
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!name.trim()) return setError("Nhập tên món.");
    const p = parseFloat(price);
    if (isNaN(p) || p <= 0) return setError("Nhập giá tiền hợp lệ (>0).");

    setSaving(true);
    try {
      if (editId) {
        // update
        const res = await fetch(`${apiBase}/menu/${editId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: name.trim(), price: p }),
        });
        if (!res.ok) {
          const err = await res.json();
          alert(err?.message || "Cập nhật thất bại");
        } else {
          resetForm();
          await fetchMenu();
        }
      } else {
        // create
        const res = await fetch(`${apiBase}/menu`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: name.trim(), price: p }),
        });
        if (!res.ok) {
          const err = await res.json();
          alert(err?.message || "Thêm món thất bại");
        } else {
          resetForm();
          await fetchMenu();
        }
      }
    } catch (err) {
      console.error(err);
      alert("Lỗi lưu món");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen pb-24 p-4 bg-gradient-to-br from-orange-50 to-yellow-50">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-orange-600 mb-4">Quản lý Menu</h1>

        <div className="bg-white rounded-2xl shadow p-4 mb-4">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
            <div className="col-span-2">
              <label className="text-sm text-gray-600">Tên món</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full mt-1 p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-orange-300"
                placeholder="Ví dụ: Trà sữa matcha"
              />
            </div>

            <div>
              <label className="text-sm text-gray-600">Giá (VNĐ)</label>
              <input
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full mt-1 p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-orange-300"
                placeholder="35000"
                inputMode="numeric"
              />
            </div>

            <div className="col-span-1 sm:col-span-3 flex gap-2 mt-2">
              <button
                type="submit"
                className="px-4 py-2 bg-gradient-to-r from-orange-500 to-yellow-400 text-gray-900 rounded-md font-semibold hover:opacity-95"
                disabled={saving}
              >
                {editId ? (saving ? "Đang cập nhật..." : "Cập nhật món") : (saving ? "Đang thêm..." : "Thêm món")}
              </button>

              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 border rounded-md text-gray-700"
                disabled={saving}
              >
                Hủy
              </button>
            </div>

            {error && <div className="col-span-3 text-red-500 text-sm">{error}</div>}
          </form>
        </div>

        <div className="bg-white rounded-2xl shadow p-4">
          <h2 className="text-lg font-semibold mb-3">Danh sách món</h2>

          {loading ? (
            <div className="text-gray-600">Đang tải...</div>
          ) : menu.length === 0 ? (
            <div className="text-gray-600">Chưa có món nào.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {menu.map((it) => (
                <div key={it._id} className="p-3 border rounded-lg flex flex-col justify-between">
                  <div>
                    <div className="text-lg font-medium text-gray-800">{it.name}</div>
                    <div className="text-orange-600 font-semibold">{Number(it.price).toLocaleString()} VNĐ</div>
                  </div>

                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => handleEdit(it)}
                      className="text-sm px-3 py-1 border rounded text-blue-600 hover:bg-blue-50"
                    >
                      Sửa
                    </button>
                    <button
                      onClick={() => handleDelete(it._id)}
                      className="text-sm px-3 py-1 border rounded text-red-600 hover:bg-red-50"
                    >
                      Xóa
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}