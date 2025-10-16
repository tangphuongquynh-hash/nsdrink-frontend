import { useState, useEffect } from "react";

function UserManagement() {
  const [users, setUsers] = useState([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("users")) || [];
    setUsers(stored);
  }, []);

  const saveUsers = (newList) => {
    localStorage.setItem("users", JSON.stringify(newList));
    setUsers(newList);
  };

  const handleAdd = () => {
    if (!phone || !name) return alert("Nhập đầy đủ thông tin!");
    const newUser = { phone, name, password: "123456", role: "user" };
    const updated = [...users, newUser];
    saveUsers(updated);
    setPhone("");
    setName("");
  };

  const handleDelete = (phone) => {
    if (phone === "0932611629") return alert("Không thể xóa tài khoản Admin!");
    saveUsers(users.filter((u) => u.phone !== phone));
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
          {users.map((u, i) => (
            <tr key={i} className="border-t hover:bg-orange-50">
              <td className="p-2">{u.name}</td>
              <td className="p-2">{u.phone}</td>
              <td className="p-2">{u.role}</td>
              <td className="p-2 text-center">
                {u.phone !== "0932611629" && (
                  <button
                    onClick={() => handleDelete(u.phone)}
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