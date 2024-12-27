import { API_BASE_URL } from '@/services/api';

const API_VERSION = 'v2';
const BASE_PATH = `/api/${API_VERSION}`;

export const buildPath = (path: string) => `${BASE_PATH}${path}`;
export const buildClinicPath = (clinicSlug: string, path: string) => buildPath(`/${clinicSlug}${path}`);

export const API_ROUTES = {
  AUTH: {
    LOGIN: buildPath('/auth/login'),
    ADMIN_LOGIN: buildPath('/admin/login'),
    REGISTER: buildPath('/auth/register'),
    LOGOUT: buildPath('/auth/logout'),
    PROFILE: buildPath('/auth/profile'),
  },
  CLINICS: {
    BASE: buildPath('/clinics'),
    VALIDATE: (slug: string) => buildPath(`/clinics/validate/${slug}`),
    APPOINTMENTS: {
      LIST: (clinicSlug: string) => buildClinicPath(clinicSlug, '/appointments'),
      CREATE: (clinicSlug: string) => buildClinicPath(clinicSlug, '/appointments'),
      DETAIL: (clinicSlug: string, id: number) => buildClinicPath(clinicSlug, `/appointments/${id}`),
      VALIDATE_TIME: (clinicSlug: string) => buildClinicPath(clinicSlug, '/appointments/validate-time'),
      RECURRING: (clinicSlug: string) => buildClinicPath(clinicSlug, '/appointments/recurring'),
      BY_DOCTOR: (clinicSlug: string, doctorId: number) => buildClinicPath(clinicSlug, `/appointments/doctor/${doctorId}`),
      BY_PATIENT: (clinicSlug: string, patientId: number) => buildClinicPath(clinicSlug, `/appointments/patient/${patientId}`),
      ACTIONS: {
        CONFIRM: (clinicSlug: string, id: number) => buildClinicPath(clinicSlug, `/appointments/${id}/confirm`),
        CANCEL: (clinicSlug: string, id: number) => buildClinicPath(clinicSlug, `/appointments/${id}/cancel`),
        COMPLETE: (clinicSlug: string, id: number) => buildClinicPath(clinicSlug, `/appointments/${id}/complete`),
      }
    },
    DOCTORS: {
      LIST: (clinicSlug: string) => buildClinicPath(clinicSlug, '/doctors'),
      CREATE: (clinicSlug: string) => buildClinicPath(clinicSlug, '/doctors'),
      DETAIL: (clinicSlug: string, id: number) => buildClinicPath(clinicSlug, `/doctors/${id}`),
    },
    PATIENTS: {
      LIST: (clinicSlug: string) => buildClinicPath(clinicSlug, '/patients'),
      CREATE: (clinicSlug: string) => buildClinicPath(clinicSlug, '/patients'),
      DETAIL: (clinicSlug: string, id: number) => buildClinicPath(clinicSlug, `/patients/${id}`),
    }
  }
} as const;

export type ApiRoutes = typeof API_ROUTES; 