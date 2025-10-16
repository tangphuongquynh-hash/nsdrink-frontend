import { Link, useLocation } from "react-router-dom";
import { Home, FileText, PlusCircle, BarChart3, User } from "lucide-react";

function BottomNav() {
  const location = useLocation();
  const currentUser = JSON.parse(localStorage.getItem("currentUser"));

  const navItems = [
    { path: "/", label: "Trang chủ", icon: <Home size={22} /> },
    { path: "/orders", label: "Đơn hàng", icon: <FileText size={22} /> },
    { path: "/new-order", label: "Order", icon: <PlusCircle size={32} />, isCenter: true },
    { path: "/report", label: "Báo cáo", icon: <BarChart3 size={22} /> },
  ];

  // Nếu là admin thì thêm mục User
  if (currentUser?.role === "admin") {
    navItems.push({ path: "/users", label: "User", icon: <User size={22} /> });
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-orange-200 flex justify-around items-center py-2 shadow-lg z-50">
      {navItems.map((item, idx) => {
        const isActive = location.pathname === item.path;
        const color = isActive ? "text-orange-500" : "text-gray-500";

        if (item.isCenter) {
          return (
            <Link
              key={idx}
              to={item.path}
              className="flex flex-col items-center justify-center -mt-8"
            >
              <div className="bg-gradient-to-br from-orange-400 to-yellow-300 rounded-full p-4 shadow-lg border-2 border-white">
                {item.icon}
              </div>
              <span className="text-xs text-orange-600 font-semibold mt-1">{item.label}</span>
            </Link>
          );
        }

        return (
          <Link
            key={idx}
            to={item.path}
            className={`flex flex-col items-center text-sm ${color}`}
          >
            {item.icon}
            <span className="text-xs mt-1">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export default BottomNav;