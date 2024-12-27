import api from './api';
import { Doctor } from './doctorService';
import { Patient } from './patientService';
import { AppointmentFilters } from '@/types/appointment';
import { API_ROUTES } from '@/config/api.routes';

export interface Appointment {
  id: number;
  clinic_id: number;
  doctor_id: number;
  patient_id: number;
  date: string;
  start_time: string;
  end_time: string;
  status: 'scheduled' | 'confirmed' | 'cancelled' | 'completed';
  notes?: string;
  doctor?: {
    id: number;
    name: string;
    email: string;
    specialty: string;
  };
  patient?: {
    id: number;
    name: string;
    email: string;
  };
  created_at: string;
  updated_at: string;
}

interface ApiResponse<T> {
  status: 'success' | 'error';
  message: string;
  data: T;
}

export interface CreateAppointmentDTO {
  doctor_id: number;
  patient_id: number;
  date: string;
  start_time: string;
  end_time: string;
  notes?: string;
  recurrence?: {
    type: 'none' | 'daily' | 'weekly' | 'monthly';
    interval?: number;
    endDate?: string;
    daysOfWeek?: number[];
    occurrences?: number;
  };
}

export interface UpdateAppointmentDTO extends Partial<CreateAppointmentDTO> {
  status?: 'scheduled' | 'confirmed' | 'cancelled' | 'completed';
}

interface AppointmentValidationError {
  message: string;
  field?: string;
  code: string;
}

interface RecurrenceInfo {
  type: 'none' | 'daily' | 'weekly' | 'monthly';
  interval?: number;
  daysOfWeek?: number[];
  endDate?: string;
  updateAll?: boolean;
  sequence?: number;
  totalInstances?: number;
  isRecurringInstance?: boolean;
  originalDate?: string;
}

class AppointmentService {
  async getAppointments(clinicSlug: string, filters?: AppointmentFilters): Promise<Appointment[]> {
    try {
      let endpoint = API_ROUTES.CLINICS.APPOINTMENTS.LIST(clinicSlug);
      
      if (filters) {
        const params = new URLSearchParams();
        if (filters.doctor) params.append('doctor_id', filters.doctor);
        if (filters.status) params.append('status', filters.status);
        if (filters.startDate) params.append('start_date', filters.startDate.toISOString().split('T')[0]);
        if (filters.endDate) params.append('end_date', filters.endDate.toISOString().split('T')[0]);
        
        const queryString = params.toString();
        if (queryString) endpoint += `?${queryString}`;
      }
      
      const response = await api.get<ApiResponse<Appointment[]>>(endpoint);
      return response.data.data || [];
    } catch (error: any) {
      console.error('Error fetching appointments:', error);
      throw error;
    }
  }

  async getAppointment(clinicSlug: string, id: number): Promise<Appointment> {
    try {
      const response = await api.get<ApiResponse<Appointment>>(
        API_ROUTES.CLINICS.APPOINTMENTS.DETAIL(clinicSlug, id)
      );
      return response.data.data || {};
    } catch (error: any) {
      console.error('Error fetching appointment details:', error);
      throw error;
    }
  }

  private async validateAppointmentTime(
    clinicSlug: string,
    doctorId: number,
    date: string,
    startTime: string,
    endTime: string,
    excludeAppointmentId?: number
  ): Promise<AppointmentValidationError[]> {
    try {
      const endpoint = `/api/v2/${clinicSlug}/appointments/validate-time`;
      const response = await api.post<ApiResponse<AppointmentValidationError[]>>(endpoint, {
        doctor_id: doctorId,
        date,
        start_time: startTime,
        end_time: endTime,
        exclude_appointment_id: excludeAppointmentId
      });
      return response.data.data || [];
    } catch (error) {
      console.error('Error validating appointment time:', error);
      return [{
        message: 'Erro ao validar horário',
        code: 'system_error'
      }];
    }
  }

  async createAppointment(clinicSlug: string, data: CreateAppointmentDTO): Promise<Appointment | Appointment[]> {
    try {
      console.log('Creating appointment:', { clinicSlug, data });

      // Validar campos obrigatórios
      const requiredFields = [
        { field: 'doctor_id', message: 'Médico é obrigatório' },
        { field: 'patient_id', message: 'Paciente é obrigatório' },
        { field: 'date', message: 'Data é obrigatória' },
        { field: 'start_time', message: 'Horário de início é obrigatório' },
        { field: 'end_time', message: 'Horário de término é obrigatório' }
      ];

      const missingFields = requiredFields.filter(field => !data[field.field as keyof CreateAppointmentDTO]);
      
      if (missingFields.length > 0) {
        throw new Error(JSON.stringify(
          missingFields.map(field => ({
            message: field.message,
            field: field.field,
            code: 'required_field'
          }))
        ));
      }

      try {
        // Normalizar formato do horário
        data.start_time = this.normalizeTimeFormat(data.start_time);
        data.end_time = this.normalizeTimeFormat(data.end_time);

        // Validar se o horário de início é anterior ao horário de término
        const startTime = new Date(`${data.date}T${data.start_time}`);
        const endTime = new Date(`${data.date}T${data.end_time}`);

        if (startTime >= endTime) {
          throw new Error(JSON.stringify([{
            message: 'O horário de início deve ser anterior ao horário de término',
            field: 'time',
            code: 'invalid_time_range'
          }]));
        }

      } catch (error) {
        if (error instanceof Error) {
          throw error;
        }
        throw new Error(JSON.stringify([{
          message: 'Formato de horário inválido',
          field: 'time',
          code: 'invalid_time_format'
        }]));
      }

      // Validar horário do agendamento
      const validationErrors = await this.validateAppointmentTime(
        clinicSlug,
        data.doctor_id,
        data.date,
        data.start_time,
        data.end_time
      );

      if (validationErrors.length > 0) {
        console.error('Validation errors:', validationErrors);
        throw new Error(JSON.stringify(validationErrors));
      }

      // Tratar agendamento regular
      if (!data.recurrence || data.recurrence.type === 'none') {
        const response = await api.post<ApiResponse<Appointment>>(`/api/v2/${clinicSlug}/appointments`, {
          ...data,
          recurrence: data.recurrence || { type: 'none' }
        });
        return response.data.data || {};
      }

      // Tratar agendamentos recorrentes
      console.log('Creating recurring appointments with data:', data.recurrence);
      const appointments = this.generateRecurringAppointments(data);
      
      if (appointments.length === 0) {
        throw new Error(JSON.stringify([{
          message: 'Não foi possível gerar os agendamentos recorrentes',
          code: 'recurring_generation_failed'
        }]));
      }

      // Validar todos os agendamentos recorrentes em paralelo
      const allValidationPromises = appointments.map(apt =>
        this.validateAppointmentTime(
          clinicSlug,
          apt.doctor_id,
          apt.date,
          apt.start_time,
          apt.end_time
        )
      );

      const allValidations = await Promise.all(allValidationPromises);
      const allErrors = allValidations.flat();

      if (allErrors.length > 0) {
        console.error('Validation errors for recurring appointments:', allErrors);
        throw new Error(JSON.stringify(allErrors));
      }

      try {
        // Adicionando informações de recorrência para cada agendamento
        const appointmentsWithRecurrence = appointments.map(apt => ({
          ...apt,
          recurrence: {
            ...(apt.recurrence || {}),
            isRecurringInstance: true,
            originalDate: data.date,
            sequence: apt.recurrence?.sequence || 0,
            totalInstances: apt.recurrence?.totalInstances || appointments.length
          }
        }));

        const response = await api.post<ApiResponse<Appointment[]>>(`/api/v2/${clinicSlug}/appointments/recurring`, {
          appointments: appointmentsWithRecurrence,
          recurrence: data.recurrence
        });
        console.log('Recurring appointments created successfully:', response.data);
        return response.data.data || [];
      } catch (error: any) {
        console.error('Error creating recurring appointments:', error);
        throw error;
      }
    } catch (error: any) {
      console.error('Error in createAppointment:', error);
      throw error;
    }
  }

  async updateAppointment(
    clinicSlug: string,
    id: number,
    data: UpdateAppointmentDTO
  ): Promise<Appointment | Appointment[]> {
    console.log('Updating appointment:', { clinicSlug, id, data });
    
    try {
      // If updating time/date, validate the new slot
      if (data.date || data.start_time || data.end_time) {
        const appointment = await this.getAppointment(clinicSlug, id);
        const validationErrors = await this.validateAppointmentTime(
          clinicSlug,
          data.doctor_id || appointment.doctor_id,
          data.date || appointment.date,
          data.start_time || appointment.start_time,
          data.end_time || appointment.end_time,
          id
        );

        if (validationErrors.length > 0) {
          throw new Error(JSON.stringify(validationErrors));
        }
      }

      // Handle recurring appointment updates
      if (data.recurrence?.updateAll) {
        const response = await api.put<ApiResponse<Appointment[]>>(`/api/v2/${clinicSlug}/appointments/${id}/recurring`, data);
        return response.data.data || [];
      } else {
        const response = await api.put<ApiResponse<Appointment>>(`/api/v2/${clinicSlug}/appointments/${id}`, data);
        return response.data.data || {};
      }
    } catch (error: any) {
      console.error('Error updating appointment:', error);
      throw error;
    }
  }

  async deleteAppointment(
    clinicSlug: string,
    id: number,
    deleteRecurring: boolean = false
  ): Promise<void> {
    console.log('Deleting appointment:', { clinicSlug, id, deleteRecurring });
    
    try {
      const endpoint = deleteRecurring
        ? `/api/v2/${clinicSlug}/appointments/${id}/recurring`
        : `/api/v2/${clinicSlug}/appointments/${id}`;
      
      await api.delete<ApiResponse<null>>(endpoint);
    } catch (error: any) {
      console.error('Error deleting appointment:', error);
      throw error;
    }
  }

  async getAppointmentsByDoctor(clinicSlug: string, doctorId: number): Promise<Appointment[]> {
    try {
      const endpoint = `/api/v2/${clinicSlug}/appointments/doctor/${doctorId}`;
      const response = await api.get<ApiResponse<Appointment[]>>(endpoint);
      return response.data.data || [];
    } catch (error: any) {
      console.error('Error fetching doctor appointments:', error);
      throw error;
    }
  }

  async getAppointmentsByPatient(clinicSlug: string, patientId: number): Promise<Appointment[]> {
    try {
      const endpoint = `/api/v2/${clinicSlug}/appointments/patient/${patientId}`;
      const response = await api.get<ApiResponse<Appointment[]>>(endpoint);
      return response.data.data || [];
    } catch (error: any) {
      console.error('Error fetching appointments by patient:', error);
      throw error;
    }
  }

  async confirmAppointment(clinicSlug: string, id: number): Promise<Appointment> {
    try {
      const endpoint = `/api/v2/${clinicSlug}/appointments/${id}/confirm`;
      const response = await api.post<ApiResponse<Appointment>>(endpoint, {});
      return response.data.data || {};
    } catch (error: any) {
      console.error('Error confirming appointment:', error);
      throw error;
    }
  }

  async cancelAppointment(clinicSlug: string, id: number): Promise<Appointment> {
    try {
      const endpoint = `/api/v2/${clinicSlug}/appointments/${id}/cancel`;
      const response = await api.post<ApiResponse<Appointment>>(endpoint, {});
      return response.data.data || {};
    } catch (error: any) {
      console.error('Error canceling appointment:', error);
      throw error;
    }
  }

  async completeAppointment(clinicSlug: string, id: number): Promise<Appointment> {
    try {
      const endpoint = `/api/v2/${clinicSlug}/appointments/${id}/complete`;
      const response = await api.post<ApiResponse<Appointment>>(endpoint, {});
      return response.data.data || {};
    } catch (error: any) {
      console.error('Error completing appointment:', error);
      throw error;
    }
  }

  private generateRecurringAppointments(data: CreateAppointmentDTO): CreateAppointmentDTO[] {
    if (!data.recurrence || data.recurrence.type === 'none') {
      return [{
        ...data,
        recurrence: { type: 'none' }
      }];
    }

    const appointments: CreateAppointmentDTO[] = [];
    const startDate = new Date(data.date);
    const endDate = data.recurrence.endDate ? new Date(data.recurrence.endDate) : null;
    const interval = data.recurrence.interval || 1;
    const maxAppointments = 52; // Limite máximo de 52 semanas (1 ano)
    let count = 0;

    let currentDate = new Date(startDate);
    
    while ((!endDate || currentDate <= endDate) && count < maxAppointments) {
      // Verifica se a data atual é válida para agendamento
      if (this.isValidAppointmentDate(currentDate, data.recurrence)) {
        appointments.push({
          ...data,
          date: currentDate.toISOString().split('T')[0],
          recurrence: {
            ...data.recurrence,
            isRecurringInstance: true,
            originalDate: data.date,
            sequence: count + 1,
            totalInstances: maxAppointments
          }
        });
        count++;
      }

      // Avança para a próxima data baseado no tipo de recorrência
      switch (data.recurrence.type) {
        case 'daily':
          currentDate = new Date(currentDate.setDate(currentDate.getDate() + interval));
          break;
        case 'weekly':
          if (data.recurrence.daysOfWeek && data.recurrence.daysOfWeek.length > 0) {
            // Para recorrência semanal com dias específicos
            const currentDay = currentDate.getDay();
            const nextDays = data.recurrence.daysOfWeek.filter(day => day > currentDay);
            
            if (nextDays.length > 0) {
              // Ainda há dias nesta semana
              currentDate = new Date(currentDate.setDate(
                currentDate.getDate() + (nextDays[0] - currentDay)
              ));
            } else {
              // Avança para o primeiro dia da próxima semana
              const daysUntilNext = 7 * interval - currentDay + data.recurrence.daysOfWeek[0];
              currentDate = new Date(currentDate.setDate(
                currentDate.getDate() + daysUntilNext
              ));
            }
          } else {
            // Recorrência semanal simples
            currentDate = new Date(currentDate.setDate(currentDate.getDate() + (7 * interval)));
          }
          break;
        case 'monthly':
          const newMonth = currentDate.getMonth() + interval;
          currentDate = new Date(currentDate.setMonth(newMonth));
          
          // Ajusta para o último dia do mês se a data original for maior
          const originalDay = startDate.getDate();
          const lastDayOfMonth = new Date(
            currentDate.getFullYear(),
            currentDate.getMonth() + 1,
            0
          ).getDate();
          
          currentDate.setDate(Math.min(originalDay, lastDayOfMonth));
          break;
      }
    }

    return appointments;
  }

  private isValidAppointmentDate(date: Date, recurrence?: RecurrenceInfo): boolean {
    // Não permite datas no passado
    if (date < new Date()) {
      return false;
    }

    // Verifica dias da semana para recorrência semanal
    if (recurrence?.type === 'weekly' && recurrence.daysOfWeek) {
      const dayOfWeek = date.getDay();
      return recurrence.daysOfWeek.includes(dayOfWeek);
    }

    // Por padrão, considera a data válida
    return true;
  }

  private normalizeTimeFormat(timeStr: string): string {
    try {
      // Handle invalid input
      if (!timeStr || typeof timeStr !== 'string') {
        throw new Error('invalid_time');
      }

      // Remove any whitespace
      timeStr = timeStr.trim();

      // Handle datetime format (e.g., "2024-11-25 13:40:00")
      if (timeStr.includes('-')) {
        const date = new Date(timeStr);
        if (isNaN(date.getTime())) {
          throw new Error('invalid_time');
        }
        // Extract time part
        timeStr = [
          date.getHours().toString().padStart(2, '0'),
          date.getMinutes().toString().padStart(2, '0')
        ].join(':');
      } else {
        // Handle time-only format
        // Remove any seconds if present
        timeStr = timeStr.split(':').slice(0, 2).join(':');
      }

      // Validate format using regex
      const timeRegex = /^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/;
      if (!timeRegex.test(timeStr)) {
        throw new Error('invalid_time');
      }

      // Split hours and minutes
      const [hours, minutes] = timeStr.split(':').map(num => {
        const parsed = parseInt(num, 10);
        if (isNaN(parsed)) {
          throw new Error('invalid_time');
        }
        return parsed;
      });

      // Validate ranges
      if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
        throw new Error('invalid_time');
      }

      // Return properly formatted time
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    } catch (error) {
      throw new Error(JSON.stringify([{
        message: 'Formato de horário inválido. Use HH:MM (ex: 14:30)',
        field: 'time',
        code: 'invalid_format'
      }]));
    }
  }
}

export default new AppointmentService();
