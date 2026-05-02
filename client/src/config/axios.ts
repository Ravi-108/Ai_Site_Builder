import axios from 'axios';

// Create a custom Axios instance
const API = axios.create({
  // Point it to your Express backend
  baseURL: import.meta.env.VITE_BASE_URL || 'http://localhost:3000',
  
  // CRITICAL: This line tells Axios to send your Better Auth cookies with every request!
  // Without this, the 'protect' middleware on your server will always say "Unauthorized"
  withCredentials: true, 
});

export default API;