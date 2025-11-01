// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || "https://nsdrink-backend.onrender.com";

export const API_ENDPOINTS = {
  base: `${API_BASE_URL}/api`,
  users: `${API_BASE_URL}/api/users`,
  menu: `${API_BASE_URL}/api/menu`,
  orders: `${API_BASE_URL}/api/orders`,
  ordersAll: `${API_BASE_URL}/api/orders/all`, // For Home page revenue calculation
  login: `${API_BASE_URL}/api/login`,
};

export default API_BASE_URL;
