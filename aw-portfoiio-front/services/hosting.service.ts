import api from "@/lib/axiosInstance";

//스테이시즌 입점 신청 (관리자)
export const HostingService = {
  adminGet: () => api.get("/api/admin-hosting"),

  putStatus: (id: number, status: string) =>
    api.put(`/api/admin-hosting/${id}/status`, null, { params: { status } }),

  delete: (id: number) => api.delete(`/api/admin-hosting/${id}`),
};
