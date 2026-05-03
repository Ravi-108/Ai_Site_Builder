import axios from 'axios';

const API = axios.create({
  // 1. Point this to your LIVE Render backend! 
  // (You can also use an environment variable here if you prefer)
  baseURL: import.meta.env.VITE_BASEURL || "https://ai-site-builder-nmc2.onrender.com", 
  
  // 2. THIS IS CRITICAL: It forces Axios to send your secure login cookie to Render
  withCredentials: true, 
});

export default API;