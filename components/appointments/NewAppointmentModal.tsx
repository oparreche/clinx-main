'use client';

import React, { useState, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import { XMarkIcon, PlusCircleIcon } from '@heroicons/react/24/outline';
import doctorService, { Doctor } from '@/services/doctorService';
import patientService, { Patient } from '@/services/patientService';
import { useParams } from 'next/navigation';

interface NewAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (appointment: AppointmentPayload) => void;
  selectedDate?: Date | null;
  doctors: Doctor[];
  patients: Patient[];
  onCreatePatient?: () => void;
}

type RecurrenceFrequency = 'none' | 'daily' | 'weekly' | 'monthly';

interface FormData {
  patient_id: string;
  doctor_id: string;
  date: string;
  time: string;
  duration: string;
  notes: string;
  room: string;
  recurrence: {
    type: RecurrenceFrequency;
    interval: number;
    endDate: string;
    daysOfWeek: number[];
    dayOfMonth?: number;
    occurrences?: number;
  };
}

export interface AppointmentPayload {
  doctor_id: number;
  patient_id: number;
  date: string;
  start_time: string;
  end_time: string;
  notes?: string;
  recurrence?: {
    type: 'none' | 'daily' | 'weekly' | 'monthly';
    interval?: number;
    daysOfWeek?: number[];
    endDate?: string;
    occurrences?: number;
  };
}

export default function NewAppointmentModal({
  isOpen,
  onClose,
  onSubmit,
  selectedDate,
  doctors: initialDoctors,
  patients: initialPatients,
  onCreatePatient
}: NewAppointmentModalProps) {
  const params = useParams();
  const clinicSlug = params.clinicSlug as string;

  const [loading, setLoading] = useState(false);
  const [doctors, setDoctors] = useState<Doctor[]>(initialDoctors);
  const [patients, setPatients] = useState<Patient[]>(initialPatients);
  const [formData, setFormData] = useState<FormData>({
    patient_id: '',
    doctor_id: '',
    date: selectedDate || new Date().toISOString().split('T')[0],
    time: '09:00',
    duration: '30',
    notes: '',
    room: '',
    recurrence: {
      type: 'none',
      interval: 1,
      endDate: '',
      daysOfWeek: []
    }
  });

  useEffect(() => {
    const fetchData = async () => {
      if (isOpen && (!initialDoctors.length || !initialPatients.length)) {
        setLoading(true);
        try {
          const [doctorsData, patientsData] = await Promise.all([
            !initialDoctors.length ? doctorService.getDoctors(clinicSlug) : Promise.resolve(initialDoctors),
            !initialPatients.length ? patientService.getPatients(clinicSlug) : Promise.resolve(initialPatients)
          ]);

          if (!initialDoctors.length) setDoctors(doctorsData);
          if (!initialPatients.length) setPatients(patientsData);
        } catch (error) {
          console.error('Error fetching data:', error);
        } finally {
          setLoading(false);
        }
      }
    };

    fetchData();
  }, [isOpen, clinicSlug, initialDoctors, initialPatients]);

  useEffect(() => {
    if (selectedDate) {
      setFormData(prev => ({
        ...prev,
        date: selectedDate.toISOString().split('T')[0]
      }));
    }
  }, [selectedDate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Criar data de início
    const [hours, minutes] = formData.time.split(':');
    const start_time = `${formData.time}:00`;

    // Calcular hora final
    const endDate = new Date();
    endDate.setHours(parseInt(hours));
    endDate.setMinutes(parseInt(minutes) + parseInt(formData.duration));
    const end_time = `${endDate.getHours().toString().padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}:00`;

    const appointment: AppointmentPayload = {
      doctor_id: parseInt(formData.doctor_id),
      patient_id: parseInt(formData.patient_id),
      date: formData.date,
      start_time: start_time,
      end_time: end_time,
      notes: formData.notes || undefined
    };

    // Adicionar dados de recorrência apenas se não for 'none'
    if (formData.recurrence.type !== 'none') {
      appointment.recurrence = {
        type: formData.recurrence.type,
        interval: formData.recurrence.interval,
        endDate: formData.recurrence.endDate,
        daysOfWeek: formData.recurrence.type === 'weekly' ? formData.recurrence.daysOfWeek : undefined
      };
    } else {
      appointment.recurrence = { type: 'none' };
    }

    onSubmit(appointment);
    onClose();
  };

  const handleRecurrenceTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const type = e.target.value as RecurrenceFrequency;
    setFormData(prev => ({
      ...prev,
      recurrence: {
        ...prev.recurrence,
        type,
        daysOfWeek: type === 'weekly' ? [] : prev.recurrence.daysOfWeek
      }
    }));
  };

  const handleDayOfWeekToggle = (day: number) => {
    setFormData(prev => {
      const currentDays = prev.recurrence.daysOfWeek;
      const newDays = currentDays.includes(day)
        ? currentDays.filter(d => d !== day)
        : [...currentDays, day];

      return {
        ...prev,
        recurrence: {
          ...prev.recurrence,
          daysOfWeek: newDays
        }
      };
    });
  };

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      className="relative z-50"
    >
      <div className="fixed inset-0 bg-black/30 z-40" aria-hidden="true" />

      <div className="fixed inset-0 flex items-center justify-center p-4 z-50">
        <Dialog.Panel className="mx-auto max-w-lg w-full rounded-lg bg-white p-6">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-500"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>

          <Dialog.Title className="text-lg font-medium text-gray-900 mb-4">
            Novo Agendamento
          </Dialog.Title>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              {/* Seleção de Paciente */}
              <div className="col-span-2 sm:col-span-1">
                <label htmlFor="patient" className="block text-sm font-medium text-gray-700">
                  Paciente
                </label>
                <div className="mt-1 flex items-center gap-2">
                  <select
                    id="patient"
                    value={formData.patient_id}
                    onChange={(e) => setFormData({ ...formData, patient_id: e.target.value })}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    required
                  >
                    <option value="">Selecione um paciente</option>
                    {patients.map((patient) => (
                      <option key={patient.id} value={patient.id}>
                        {patient.name}
                      </option>
                    ))}
                  </select>
                  {onCreatePatient && (
                    <button
                      type="button"
                      onClick={onCreatePatient}
                      className="inline-flex items-center text-blue-600 hover:text-blue-700"
                    >
                      <PlusCircleIcon className="h-5 w-5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Seleção de Médico */}
              <div className="col-span-2 sm:col-span-1">
                <label htmlFor="doctor" className="block text-sm font-medium text-gray-700">
                  Médico
                </label>
                <select
                  id="doctor"
                  value={formData.doctor_id}
                  onChange={(e) => setFormData({ ...formData, doctor_id: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  required
                >
                  <option value="">Selecione um médico</option>
                  {doctors.map((doctor) => (
                    <option key={doctor.id} value={doctor.id}>
                      {doctor.name} - {doctor.specialization}
                    </option>
                  ))}
                </select>
              </div>

              {/* Data */}
              <div>
                <label htmlFor="date" className="block text-sm font-medium text-gray-700">
                  Data
                </label>
                <input
                  type="date"
                  id="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  required
                />
              </div>

              {/* Horário */}
              <div>
                <label htmlFor="time" className="block text-sm font-medium text-gray-700">
                  Horário
                </label>
                <input
                  type="time"
                  id="time"
                  value={formData.time}
                  onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  required
                />
              </div>

              {/* Duração */}
              <div>
                <label htmlFor="duration" className="block text-sm font-medium text-gray-700">
                  Duração (minutos)
                </label>
                <select
                  id="duration"
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                >
                  <option value="15">15 minutos</option>
                  <option value="30">30 minutos</option>
                  <option value="45">45 minutos</option>
                  <option value="60">1 hora</option>
                  <option value="90">1 hora e 30 minutos</option>
                  <option value="120">2 horas</option>
                </select>
              </div>

              {/* Recorrência */}
              <div className="col-span-2">
                <label htmlFor="recurrence-type" className="block text-sm font-medium text-gray-700">
                  Recorrência
                </label>
                <select
                  id="recurrence-type"
                  value={formData.recurrence.type}
                  onChange={handleRecurrenceTypeChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                >
                  <option value="none">Sem recorrência</option>
                  <option value="daily">Diariamente</option>
                  <option value="weekly">Semanalmente</option>
                  <option value="monthly">Mensalmente</option>
                </select>
              </div>

              {/* Campos de Recorrência */}
              {formData.recurrence.type !== 'none' && (
                <>
                  {/* Intervalo */}
                  <div className="col-span-2 sm:col-span-1">
                    <label htmlFor="interval" className="block text-sm font-medium text-gray-700">
                      Intervalo
                    </label>
                    <div className="mt-1 flex items-center gap-2">
                      <input
                        type="number"
                        id="interval"
                        min="1"
                        value={formData.recurrence.interval}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          recurrence: {
                            ...prev.recurrence,
                            interval: parseInt(e.target.value)
                          }
                        }))}
                        className="block w-20 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                        required
                      />
                      <span className="text-sm text-gray-500">
                        {formData.recurrence.type === 'daily' && 'dias'}
                        {formData.recurrence.type === 'weekly' && 'semanas'}
                        {formData.recurrence.type === 'monthly' && 'meses'}
                      </span>
                    </div>
                  </div>

                  {/* Data Final */}
                  <div className="col-span-2 sm:col-span-1">
                    <label htmlFor="end-date" className="block text-sm font-medium text-gray-700">
                      Data Final
                    </label>
                    <input
                      type="date"
                      id="end-date"
                      value={formData.recurrence.endDate}
                      min={formData.date}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        recurrence: {
                          ...prev.recurrence,
                          endDate: e.target.value
                        }
                      }))}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      required
                    />
                  </div>

                  {/* Dias da Semana (apenas para recorrência semanal) */}
                  {formData.recurrence.type === 'weekly' && (
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Dias da Semana
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day, index) => (
                          <button
                            key={day}
                            type="button"
                            onClick={() => handleDayOfWeekToggle(index)}
                            className={`px-3 py-1 rounded-full text-sm font-medium ${formData.recurrence.daysOfWeek.includes(index)
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                              }`}
                          >
                            {day}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Observações */}
              <div className="col-span-2">
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
                  Observações
                </label>
                <textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  placeholder="Adicione observações importantes sobre o agendamento..."
                />
              </div>
            </div>

            {/* Botões */}
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="inline-flex justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Agendar
              </button>
            </div>
          </form>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}