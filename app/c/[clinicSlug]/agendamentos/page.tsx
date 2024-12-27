'use client';

import { useState, useEffect, Suspense } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { useParams } from 'next/navigation';
import { EventClickArg, DateSelectArg } from '@fullcalendar/core';
import { FaCalendarAlt, FaList, FaPlus, FaFilter } from 'react-icons/fa';
import appointmentService, { Appointment, CreateAppointmentDTO } from '@/services/appointmentService';
import doctorService, { Doctor } from '@/services/doctorService';
import patientService, { Patient } from '@/services/patientService';
import NewAppointmentModal from '@/components/appointments/NewAppointmentModal';
import EditAppointmentModal from '@/components/appointments/EditAppointmentModal';
import AppointmentList from '@/components/appointments/AppointmentList';
import FilterPanel from '@/components/appointments/FilterPanel';
import NewPatientModal from '@/components/patients/NewPatientModal';
import { useAuth } from '@/auth/context/AuthContext';

function AgendamentosContent() {
  const params = useParams();
  const clinicSlug = params.clinicSlug as string;
  const { user } = useAuth();

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [filteredAppointments, setFilteredAppointments] = useState<Appointment[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [isNewPatientModalOpen, setIsNewPatientModalOpen] = useState(false);
  const [activeView, setActiveView] = useState<'calendar' | 'list'>('calendar');
  const [showFilters, setShowFilters] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [calendarEvents, setCalendarEvents] = useState<any[]>([]);
  const [filters, setFilters] = useState({
    search: '',
    doctor: '',
    patient: '',
    status: '',
    startDate: null as Date | null,
    endDate: null as Date | null
  });
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  useEffect(() => {
    const loadData = async () => {
      if (!clinicSlug || !user) {
        console.log('Missing required data:', { clinicSlug, user });
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        console.log('Loading appointments data for clinic:', clinicSlug);

        const [doctorsData, patientsData] = await Promise.all([
          doctorService.getDoctors(clinicSlug),
          patientService.getPatients(clinicSlug),
        ]);

        let appointmentsData: Appointment[] = [];
        try {
          if (filters.doctor) {
            appointmentsData = await appointmentService.getAppointmentsByDoctor(clinicSlug, parseInt(filters.doctor));
          } else {
            appointmentsData = await appointmentService.getAppointments(clinicSlug, filters);
          }
        } catch (err) {
          console.error('Error loading appointments:', err);
          setError('Erro ao carregar agendamentos. Por favor, tente novamente.');
        }

        console.log('Data loaded successfully:', {
          appointments: appointmentsData.length,
          doctors: doctorsData.length,
          patients: patientsData.length
        });

        // Transform appointments for calendar
        const calendarEventsData = (appointmentsData || []).map(appointment => {
          if (!appointment || typeof appointment.id === 'undefined') {
            console.warn('Invalid appointment data:', appointment);
            return null;
          }

          return {
            id: appointment.id.toString(),
            title: `${appointment.patient?.name || 'Paciente'} - ${appointment.doctor?.name || 'Médico'}`,
            start: appointment.start_time,
            end: appointment.end_time,
            className: `status-${appointment.status}`,
            backgroundColor: getStatusColor(appointment.status),
            borderColor: getStatusColor(appointment.status),
            extendedProps: {
              doctor: appointment.doctor || null,
              patient: appointment.patient || null,
              status: appointment.status,
              notes: appointment.notes,
            }
          };
        }).filter(event => event !== null);

        setAppointments(appointmentsData || []);
        setFilteredAppointments(appointmentsData || []);
        setDoctors(doctorsData);
        setPatients(patientsData);
        setCalendarEvents(calendarEventsData);
      } catch (err: any) {
        console.error('Error loading appointments:', err);
        setError(err.response?.data?.message || 'Erro ao carregar os agendamentos');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [clinicSlug, user, filters]);

  // Aplicar filtros aos agendamentos
  useEffect(() => {
    console.log('Applying filters:', filters);

    let filtered = [...appointments];

    if (filters.doctor) {
      filtered = filtered.filter(app => app.doctor?.id.toString() === filters.doctor);
    }
    if (filters.patient) {
      filtered = filtered.filter(app => app.patient?.id.toString() === filters.patient);
    }
    if (filters.status) {
      filtered = filtered.filter(app => app.status === filters.status);
    }
    if (filters.startDate && filters.startDate !== null) {
      filtered = filtered.filter(app => new Date(app.start_time) >= new Date(filters.startDate as Date));
    }
    if (filters.endDate && filters.endDate !== null) {
      filtered = filtered.filter(app => new Date(app.start_time) <= new Date(filters.endDate as Date));
    }
    if (filters.search) {
      filtered = filtered.filter(app => {
        const search = filters.search.toLowerCase();
        return (
          app.doctor?.name.toLowerCase().includes(search) ||
          app.patient?.name.toLowerCase().includes(search) ||
          app.notes?.toLowerCase().includes(search) || false
        );
      });
    }

    console.log('Filtered appointments:', {
      total: appointments.length,
      filtered: filtered.length
    });

    // Atualizar tanto a lista quanto os eventos do calendário
    setFilteredAppointments(filtered);

    // Atualizar eventos do calendário
    const calendarEventsData = filtered.map(appointment => ({
      id: appointment.id.toString(),
      title: `${appointment.patient?.name || 'Paciente'} - ${appointment.doctor?.name || 'Médico'}`,
      start: appointment.start_time,
      end: appointment.end_time,
      className: `status-${appointment.status}`,
      backgroundColor: getStatusColor(appointment.status),
      borderColor: getStatusColor(appointment.status),
      extendedProps: {
        doctor: appointment.doctor,
        patient: appointment.patient,
        status: appointment.status,
        notes: appointment.notes,
      }
    }));
    setCalendarEvents(calendarEventsData);
  }, [filters, appointments]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return '#64B5F6'; // Azul claro
      case 'confirmed':
        return '#81C784'; // Verde claro
      case 'cancelled':
        return '#E57373'; // Vermelho claro
      case 'completed':
        return '#90A4AE'; // Cinza claro
      default:
        return '#B0BEC5'; // Cinza mais claro
    }
  };

  const handleAppointmentClick = (info: EventClickArg) => {
    const appointmentId = parseInt(info.event.id);
    const appointment = appointments.find(a => a.id === appointmentId);
    if (appointment) {
      setSelectedAppointment(appointment);
      setIsModalOpen(true);
    } else {
      console.error('Appointment not found:', appointmentId);
    }
  };

  const handleAppointmentSelect = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setIsModalOpen(true);
  };

  const handleCreateAppointment = async (data: CreateAppointmentDTO) => {
    if (!clinicSlug) {
      console.error('Missing clinic slug');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log('Creating appointment:', data);

      const formatDate = (date: string) => date.replace('T', ' ').replace('.000Z', '');

      const newAppointment = await appointmentService.createAppointment(clinicSlug, {
        doctor_id: data.doctor_id,
        patient_id: data.patient_id,
        date: data.date,
        start_time: formatDate(data.start_time),
        end_time: formatDate(data.end_time),
        notes: data.notes
      });

      console.log('Appointment created:', newAppointment);

      // Handle both single appointment and array of appointments
      setAppointments(prev => {
        if (Array.isArray(newAppointment)) {
          return [...prev, ...newAppointment];
        }
        return [...prev, newAppointment];
      });

      setIsNewModalOpen(false);
    } catch (err: any) {
      console.error('Error creating appointment:', err);
      setError(err.response?.data?.message || 'Erro ao criar agendamento');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateAppointment = async (id: number, data: any) => {
    if (!clinicSlug) {
      console.error('Missing clinic slug');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log('Updating appointment:', { id, data });

      const updatedAppointment = await appointmentService.updateAppointment(clinicSlug, id, data);

      console.log('Appointment updated:', updatedAppointment);

      setAppointments(prev => {
        if (Array.isArray(updatedAppointment)) {
          // If it's an array of appointments (recurring update), replace all affected appointments
          const updatedIds = new Set(updatedAppointment.map(a => a.id));
          return [
            ...prev.filter(a => !updatedIds.has(a.id)), // Keep appointments not in the update
            ...updatedAppointment // Add all updated appointments
          ];
        }
        // If it's a single appointment, just update that one
        return prev.map(a => a.id === id ? updatedAppointment : a);
      });

      setIsModalOpen(false);
    } catch (err: any) {
      console.error('Error updating appointment:', err);
      setError(err.response?.data?.message || 'Erro ao atualizar agendamento');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAppointment = async (id: number) => {
    if (!clinicSlug || !window.confirm('Tem certeza que deseja excluir este agendamento?')) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log('Deleting appointment:', id);

      await appointmentService.deleteAppointment(clinicSlug, id);

      console.log('Appointment deleted successfully');

      setAppointments(prev => prev.filter(a => a.id !== id));
      setIsModalOpen(false);
    } catch (err: any) {
      console.error('Error deleting appointment:', err);
      setError(err.response?.data?.message || 'Erro ao excluir agendamento');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilterChange = (newFilters: any) => {
    console.log('Applying filters:', newFilters);
    setFilters(newFilters);
  };

  const handleDateClick = (info: DateSelectArg) => {
    setSelectedDate(new Date(info.start));
    setIsNewModalOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-500 text-center">
          <h3 className="text-lg font-semibold">Erro ao carregar agendamentos</h3>
          <p>{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setActiveView('calendar')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg ${activeView === 'calendar'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
          >
            <FaCalendarAlt className="w-4 h-4" />
            <span>Calendário</span>
          </button>
          <button
            onClick={() => setActiveView('list')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg ${activeView === 'list'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
          >
            <FaList className="w-4 h-4" />
            <span>Lista</span>
          </button>
        </div>

        <div className="flex space-x-4">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg ${showFilters
              ? 'bg-blue-100 text-blue-700'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
          >
            <FaFilter className="w-4 h-4" />
            <span>Filtros</span>
          </button>
          <button
            onClick={() => setIsNewModalOpen(true)}
            className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors shadow-md"
          >
            <FaPlus className="w-4 h-4" />
            <span>Novo Agendamento</span>
          </button>
        </div>
      </div>

      {/* Painel de Filtros */}
      {showFilters && (
        <div className="bg-white rounded-lg shadow p-4 transition-all">
          <FilterPanel
            doctors={doctors}
            patients={patients}
            filters={filters}
            onFilterChange={handleFilterChange}
          />
        </div>
      )}

      {/* Conteúdo Principal */}
      <div className="bg-white rounded-lg shadow">
        {activeView === 'calendar' ? (
          <div className="p-4">
            <FullCalendar
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
              initialView="dayGridMonth"
              headerToolbar={{
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,timeGridWeek,timeGridDay'
              }}
              events={calendarEvents}
              eventClick={handleAppointmentClick}
              selectable={true}
              select={handleDateClick}
              slotMinTime="08:00:00"
              slotMaxTime="18:00:00"
              allDaySlot={false}
              locale="pt-br"
              buttonText={{
                today: 'Hoje',
                month: 'Mês',
                week: 'Semana',
                day: 'Dia'
              }}
              slotLabelFormat={{
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
              }}
              eventTimeFormat={{
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
              }}
              nowIndicator={true}
              dayHeaderFormat={{
                weekday: 'short',
                day: 'numeric',
                month: 'numeric'
              }}
              businessHours={{
                daysOfWeek: [1, 2, 3, 4, 5],
                startTime: '08:00',
                endTime: '18:00',
              }}
              height="auto"
              expandRows={true}
              stickyHeaderDates={true}
              handleWindowResize={true}
            />
          </div>
        ) : (
          <AppointmentList
            appointments={filteredAppointments}
            onSelectAppointment={handleAppointmentSelect}
          />
        )}
      </div>

      {/* Modais */}
      <NewAppointmentModal
        isOpen={isNewModalOpen}
        onClose={() => {
          setIsNewModalOpen(false);
          setSelectedDate(null);
        }}
        onSubmit={handleCreateAppointment}
        selectedDate={selectedDate}
        doctors={doctors}
        patients={patients}
        onCreatePatient={() => setIsNewPatientModalOpen(true)}
      />

      <NewPatientModal
        isOpen={isNewPatientModalOpen}
        onClose={() => setIsNewPatientModalOpen(false)}
        onSuccess={async () => {
          const updatedPatients = await patientService.getPatients(clinicSlug);
          setPatients(updatedPatients);
        }}
        clinicSlug={clinicSlug}
      />

      {selectedAppointment && (
        <EditAppointmentModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedAppointment(null);
          }}
          appointment={selectedAppointment}
          onUpdate={handleUpdateAppointment}
          onDelete={handleDeleteAppointment}
          doctors={doctors}
          patients={patients}
        />
      )}
    </div>
  );
}

export default function AgendamentosPage() {
  return (
    <Suspense fallback={<div>Carregando...</div>}>
      <div className="p-4 pt-24 space-y-4">
        <AgendamentosContent />
      </div>
    </Suspense>
  );
}