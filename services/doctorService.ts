import api from '@/services/api';
import { API_ROUTES } from '@/config/api.routes';

export interface Doctor {
  id: number;
  name: string;
  email: string;
  phone: string;
  specialization: string;
  crm: string;
  available_days?: string[];
  available_hours?: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateDoctorDTO {
  name: string;
  email: string;
  phone: string;
  specialization: string;
  crm: string;
  available_days?: string[];
  available_hours?: string[];
}

class DoctorService {
  async getDoctors(clinicSlug: string): Promise<Doctor[]> {
    const response = await api.get<Doctor[]>(API_ROUTES.CLINICS.DOCTORS.LIST(clinicSlug));
    return response.data;
  }

  async getDoctor(clinicSlug: string, id: number): Promise<Doctor> {
    const response = await api.get<Doctor>(API_ROUTES.CLINICS.DOCTORS.DETAIL(clinicSlug, id));
    return response.data;
  }

  async createDoctor(clinicSlug: string, data: CreateDoctorDTO): Promise<Doctor> {
    const response = await api.post<Doctor>(API_ROUTES.CLINICS.DOCTORS.CREATE(clinicSlug), data);
    return response.data;
  }

  async updateDoctor(clinicSlug: string, id: number, data: Partial<CreateDoctorDTO>): Promise<Doctor> {
    const response = await api.put<Doctor>(API_ROUTES.CLINICS.DOCTORS.DETAIL(clinicSlug, id), data);
    return response.data;
  }

  async deleteDoctor(clinicSlug: string, id: number): Promise<void> {
    await api.delete(API_ROUTES.CLINICS.DOCTORS.DETAIL(clinicSlug, id));
  }
}

export default new DoctorService();
