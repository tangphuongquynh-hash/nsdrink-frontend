import { useState, useEffect } from "react";

const API_BASE = "https://nsdrink-backend.onrender.com/api"; // backend API base

function UserManagement() {
  const [users, setUsers] = useState([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  // Lấy danh sách người dùng từ backend
  useEffect(() => {
    fetch(`${API_BASE}/users`)
      .then(res => res.json())
      .then(data => setUsers(data))
      .catch(err => console.log("Fetch users error:", err));
  }, []);

  // Thêm user mới
  const handleAdd = () => {
    if (!phone || !name) return alert("Nhập đầy đủ thông tin!");
    const newUser = { phone, name, password: "123456", role: "user" };

    fetch(`${API_BASE}/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newUser)
    })
      .then(res => {
        if (!res.ok) throw new Error("Thêm user thất bại!");
        return res.json();
      })
      .then(data => setUsers(prev => [...prev, data]))
      .catch(err => alert(err.message));

    setPhone("");
    setName("");
  };

  // Xóa user
  const handleDelete = (id, role) => {
    if (role === "admin") return alert("Không thể xóa tài khoản Admin!");

    fetch(`${API_BASE}/users/${id}`, { method: "DELETE" })
      .then(res => {
        if (!res.ok) throw new Error("Xóa thất bại!");
        return res.json();
      })
      .then(() => setUsers(prev => prev.filter(u => u._id !== id)))
      .catch(err => alert(err.message));
  };

  return (
    <div className="p-4 bg-white min-h-screen">
      <h1 className="text-xl font-bold mb-4 text-orange-600">Quản lý người dùng</h1>

      <div className="flex gap-2 mb-4">
        <input
          type="text"
          placeholder="Tên"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="border border-orange-300 rounded-lg px-3 py-2 w-1/2"
        />
        <input
          type="text"
          placeholder="Số điện thoại"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="border border-orange-300 rounded-lg px-3 py-2 w-1/2"
        />
        <button
          onClick={handleAdd}
          className="bg-gradient-to-r from-orange-500 to-yellow-400 text-white px-4 py-2 rounded-lg font-semibold shadow"
        >
          Thêm
        </button>
      </div>

      <table className="w-full border border-orange-200 text-sm">
        <thead>
          <tr className="bg-orange-100 text-orange-700">
            <th className="p-2 text-left">Tên</th>
            <th className="p-2 text-left">SĐT</th>
            <th className="p-2 text-left">Vai trò</th>
            <th className="p-2 text-center">Hành động</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u._id} className="border-t hover:bg-orange-50">
              <td className="p-2">{u.name}</td>
              <td className="p-2">{u.phone}</td>
              <td className="p-2">{u.role}</td>
              <td className="p-2 text-center">
                {u.role !== "admin" && (
                  <button
                    onClick={() => handleDelete(u._id, u.role)}
                    className="text-red-500 font-semibold"
                  >
                    Xóa
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default UserManagement;
