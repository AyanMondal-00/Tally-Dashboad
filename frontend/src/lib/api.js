import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const api = axios.create({ baseURL: API });

export const getCompanies = () => api.get("/companies").then((r) => r.data);
export const getDashboard = (role, companyId) =>
  api.get(`/dashboard/${role}`, { params: { company_id: companyId } }).then((r) => r.data);
export const getLedger = (ledgerId, companyId) =>
  api.get(`/ledger/${ledgerId}`, { params: { company_id: companyId } }).then((r) => r.data);
export const resetDemo = () => api.post("/reset-demo").then((r) => r.data);
export const uploadTally = (file) => {
  const fd = new FormData();
  fd.append("file", file);
  return api.post("/upload", fd, { headers: { "Content-Type": "multipart/form-data" } }).then((r) => r.data);
};
