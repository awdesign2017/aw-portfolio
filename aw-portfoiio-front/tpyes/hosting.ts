export type HostApplicationStatus = 'NEW' | 'REVIEWING' | 'DONE';

export interface HostApplication {
    id: number;
    managerName: string;
    managerPhone: string;
    managerEmail: string;
    experience: string;
    stayName: string;
    stayAddress: string;
    website: string | null;
    stayIntro: string;
    businessRegistered: string;
    businessType: string;
    images: { name: string; url: string }[];
    status: HostApplicationStatus;
    createdAt: string;
}
