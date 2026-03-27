// Dynamic API URL based on the current host, defaulting to port 5000
export const API_URL =
  import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:5000`;
