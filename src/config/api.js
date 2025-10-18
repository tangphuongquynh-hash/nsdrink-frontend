// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || "https://nsdrink-backend.onrender.com/api";

export const API_ENDPOINTS = {
  base: API_BASE_URL,
  users: `${API_BASE_URL}/users`,
  menu: `${API_BASE_URL}/menu`,
  orders: `${API_BASE_URL}/orders`,
  login: `${API_BASE_URL}/login`, // ✅ sửa chỗ này
};

export default API_BASE_URL;
