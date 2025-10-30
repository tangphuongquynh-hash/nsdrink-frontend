# Phân quyền Admin trong NSdrink POS

## Các thay đổi đã thực hiện

### 1. Báo cáo (Report) - Chỉ Admin
- **File:** `src/App.jsx`
- **Thay đổi:** Thêm `adminOnly` prop cho Route `/report`
- **Kết quả:** Chỉ admin mới có thể truy cập trang báo cáo

```jsx
<Route
  path="/report"
  element={
    <ProtectedRoute adminOnly>
      <Report />
    </ProtectedRoute>
  }
/>
```

### 2. Chỉnh sửa giá trong Bills - Chỉ Admin
- **File:** `src/pages/Bills.jsx`
- **Thay đổi:** 
  - Thêm kiểm tra `isAdmin` từ `currentUser.role`
  - Chỉ admin mới thấy input field để chỉnh sửa giá
  - User thường chỉ thấy giá hiển thị (read-only)

```jsx
// Thêm kiểm tra admin
const currentUser = JSON.parse(localStorage.getItem("currentUser"));
const isAdmin = currentUser?.role === "admin";

// Conditional rendering cho price input
{isAdmin ? (
  <input
    type="number"
    value={item.price}
    onChange={(e) => handleChangeItem(idx, "price", e.target.value)}
    className="w-24 border rounded px-1"
  />
) : (
  <span className="w-24 px-1">{Number(item.price).toLocaleString()}₫</span>
)}
```

### 3. Menu quản lý (Menu) - Đã có sẵn Admin Only
- **File:** `src/App.jsx` 
- **Trạng thái:** Đã có `adminOnly` từ trước
- **Kết quả:** Chỉ admin mới có thể truy cập trang quản lý menu

### 4. Navigation Bottom Bar - Ẩn menu cho non-admin
- **File:** `src/components/BottomNav.jsx`
- **Thay đổi:** 
  - Di chuyển Report vào trong điều kiện `if (currentUser?.role === "admin")`
  - User thường không thấy tab "Báo cáo" và "User" trong bottom navigation

```jsx
const navItems = [
  { path: "/", label: "Trang chủ", icon: <Home size={22} /> },
  { path: "/bills", label: "Đơn hàng", icon: <FileText size={22} /> },
  { path: "/new-order", label: "Order", icon: <PlusCircle size={32} />, isCenter: true },
];

// Chỉ admin mới thấy Report và User management
if (currentUser?.role === "admin") {
  navItems.push({ path: "/report", label: "Báo cáo", icon: <BarChart3 size={22} /> });
  navItems.push({ path: "/users", label: "User", icon: <User size={22} /> });
}
```

## Tóm tắt phân quyền

### Admin có thể:
- ✅ Xem tất cả trang (Home, Bills, New Order, Report, User Management, Menu)
- ✅ Chỉnh sửa giá trong Bills
- ✅ Quản lý Menu (thêm/sửa/xóa món)
- ✅ Xem báo cáo chi tiết
- ✅ Quản lý user

### User thường có thể:
- ✅ Xem trang chủ (Home)
- ✅ Xem Bills nhưng KHÔNG thể chỉnh sửa giá (chỉ xem)
- ✅ Tạo đơn hàng mới (New Order)
- ❌ KHÔNG thể xem Report
- ❌ KHÔNG thể quản lý Menu
- ❌ KHÔNG thể quản lý User

## Cách kiểm tra

1. **Đăng nhập với tài khoản admin:**
   - Bottom navigation hiển thị 5 tab: Trang chủ, Đơn hàng, Order, Báo cáo, User
   - Có thể truy cập `/report` và `/menu`
   - Trong Bills, có thể chỉnh sửa giá

2. **Đăng nhập với tài khoản user thường:**
   - Bottom navigation chỉ hiển thị 3 tab: Trang chủ, Đơn hàng, Order
   - Truy cập `/report` sẽ bị redirect về trang chủ
   - Trong Bills, chỉ xem được giá, không chỉnh sửa được