import { Routes, Route, Navigate } from "react-router-dom";
import Home from "./pages/Home";
import Login from "./pages/Login";
import UserManagement from "./pages/UserManagement";
import Menu from "./pages/Menu";
import BottomNav from "./components/BottomNav";
import ProtectedRoute from "./components/ProtectedRoute";
import NewOrder from "./pages/NewOrder";

function App() {
  const currentUser = JSON.parse(localStorage.getItem("currentUser"));

  return (
    <div className="pb-20">
      <Routes>
        {/* Trang chính */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          }
        />

        {/* Trang đăng nhập */}
        <Route path="/login" element={<Login />} />

        {/* Trang quản lý người dùng */}
        <Route
          path="/users"
          element={
            <ProtectedRoute adminOnly>
              <UserManagement />
            </ProtectedRoute>
          }
        />

        {/* Trang Menu (chỉ admin mới vào được) */}
        <Route
          path="/menu"
          element={
            <ProtectedRoute adminOnly>
              <Menu />
            </ProtectedRoute>
          }
        />

        {/* Trang tạo đơn hàng mới */}
        <Route
          path="/new-order"
          element={
            <ProtectedRoute>
              <NewOrder />
            </ProtectedRoute>
          }
        />

        {/* Route mặc định */}
        <Route
          path="*"
          element={<Navigate to={currentUser ? "/" : "/login"} />}
        />
      </Routes>

      {/* Thanh điều hướng luôn hiển thị khi có user đăng nhập */}
      {currentUser && <BottomNav />}
    </div>
  );
}

export default App;