import axios from "axios";

const BACKEND_BASE =
  process.env.REACT_APP_BACKEND_URL && !process.env.REACT_APP_BACKEND_URL.includes("localhost:3000")
    ? process.env.REACT_APP_BACKEND_URL
    : "http://localhost:8000";

const API = `${BACKEND_BASE}/api`;

export const api = axios.create({ baseURL: API });

export const getCompanies = () => api.get("/companies").then((r) => r.data);
export const getDashboard = (role, companyId, filterParams = {}) =>
  api.get(`/dashboard/${role}`, { params: { company_id: companyId, ...filterParams } }).then((r) => r.data);

export const getLedger = (ledgerId, companyId) =>
  api.get(`/ledger/${ledgerId}`, { params: { company_id: companyId } }).then((r) => r.data);
export const resetDemo = () => api.post("/reset-demo").then((r) => r.data);
export const uploadTally = (file, mode = "merge") => {
  const fd = new FormData();
  fd.append("file", file);
  return api
    .post("/upload", fd, { params: { mode }, headers: { "Content-Type": "multipart/form-data" } })
    .then((r) => r.data);
};
export const getTallyStatus = () => api.get("/tally/status").then((r) => r.data);
export const disconnectTally = () => api.delete("/tally").then((r) => r.data);
