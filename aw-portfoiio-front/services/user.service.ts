import {Params} from "@/components/Pagination";
import api from "@/lib/axiosInstance";

interface user {
    email: string;
    password: string;
    name: string;
    role: string | null;

}

export const UserService = {
    get: (params: Params) => api.get("/api/user-list", { params }),

    post: (newUser : user) => api.post(`/api/user-list` , newUser),

    //역할 변경 (최고 관리자 전용)
    putRole: (memberId: string, role: string) => api.put(`/api/user-list/role`, { memberId, role }),

};
