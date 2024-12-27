import api from '@/services/api';
import { API_ROUTES } from '@/config/api.routes';

export interface Patient {
  id: number;
  name: string;
  email: string;
  phone: string;
  birth_date: string;
  gender: string;
  cpf: string;
  rg?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  health_insurance?: string;
  health_insurance_number?: string;
  allergies?: string;
  chronic_conditions?: string;
  medications?: string;
  notes?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreatePatientDTO {
  name: string;
  email: string;
  phone: string;
  birth_date: string;
  gender: string;
  cpf: string;
  rg?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  health_insurance?: string;
  health_insurance_number?: string;
  allergies?: string;
  chronic_conditions?: string;
  medications?: string;
  notes?: string;
}

class PatientService {
  async getPatients(clinicSlug: string): Promise<Patient[]> {
    const response = await api.get<Patient[]>(API_ROUTES.CLINICS.PATIENTS.LIST(clinicSlug));
    return response.data;
  }

  async getPatient(clinicSlug: string, id: number): Promise<Patient> {
    const response = await api.get<Patient>(API_ROUTES.CLINICS.PATIENTS.DETAIL(clinicSlug, id));
    return response.data;
  }

  async createPatient(clinicSlug: string, data: CreatePatientDTO): Promise<Patient> {
    const response = await api.post<Patient>(API_ROUTES.CLINICS.PATIENTS.CREATE(clinicSlug), data);
    return response.data;
  }

  async updatePatient(clinicSlug: string, id: number, data: Partial<CreatePatientDTO>): Promise<Patient> {
    const response = await api.put<Patient>(API_ROUTES.CLINICS.PATIENTS.DETAIL(clinicSlug, id), data);
    return response.data;
  }

  async deletePatient(clinicSlug: string, id: number): Promise<void> {
    await api.delete(API_ROUTES.CLINICS.PATIENTS.DETAIL(clinicSlug, id));
  }
}

export default new PatientService();
