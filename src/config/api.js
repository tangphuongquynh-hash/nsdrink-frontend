// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE || "https://nsdrink-backend.onrender.com";

export const API_ENDPOINTS = {
  base: API_BASE_URL,
  users: `${API_BASE_URL}/api/users`,
  menu: `${API_BASE_URL}/api/menu`,
  orders: `${API_BASE_URL}/api/orders`,
  login: `${API_BASE_URL}/api/auth/login`,
};

export { FRONTEND_URL };
export default API_BASE_URL;