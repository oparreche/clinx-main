import React from 'react';
import { Appointment as ApiAppointment } from '@/services/appointmentService';

interface AppointmentListProps {
  title: string;
  appointments: ApiAppointment[];
}

export default function AppointmentList({ title, appointments }: AppointmentListProps) {
  const getStatusColor = (status: ApiAppointment['status']) => {
    switch (status) {
      case 'scheduled':
        return 'bg-yellow-100 text-yellow-800';
      case 'confirmed':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (!appointments || appointments.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">{title}</h2>
        <p className="text-gray-500 text-center">Nenhum agendamento encontrado</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold mb-4">{title}</h2>
      <div className="space-y-4">
        {appointments.map((appointment) => (
          <div key={appointment.id} className="flex items-center justify-between border-b pb-4">
            <div>
              <p className="font-medium">{appointment.patient?.name}</p>
              <div className="text-sm text-gray-500">
                <p>{appointment.doctor?.name}</p>
                <p>{new Date(appointment.date).toLocaleDateString()} às {appointment.start_time}</p>
              </div>
            </div>
            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(appointment.status)}`}>
              {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}