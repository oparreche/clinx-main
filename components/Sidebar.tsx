'use client';

import { Appointment } from '@/types/appointment';
import { Doctor } from '@/services/doctorService';
import { Patient } from '@/services/patientService';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useMemo } from 'react';
import { useAuth } from '@/auth/context/AuthContext';
import {
  FaHome,
  FaUserMd,
  FaUsers,
  FaUserTie,
  FaCalendarAlt,
  FaStickyNote,
  FaMoneyBillWave,
  FaListAlt,
  FaCog,
  FaChevronLeft,
  FaChevronRight,
  FaStethoscope,
  FaPlus,
} from 'react-icons/fa';
import NewAppointmentModal, { AppointmentPayload } from './appointments/NewAppointmentModal';

interface SidebarProps {
  isCollapsed: boolean;
  onCollapse?: (collapsed: boolean) => void;
}

const Sidebar = ({ isCollapsed, onCollapse }: SidebarProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const pathname = usePathname();
  const { clinicSlug } = useAuth();
  const router = useRouter();

  const menuItems = useMemo(() => {
    if (!clinicSlug) return [];

    return [
      { icon: FaHome, label: 'Dashboard', href: `/c/${clinicSlug}/dashboard` },
      { icon: FaCalendarAlt, label: 'Agendamentos', href: `/c/${clinicSlug}/agendamentos` },
      { icon: FaUserMd, label: 'Psicólogos', href: `/c/${clinicSlug}/psicologos` },
      { icon: FaUsers, label: 'Pacientes', href: `/c/${clinicSlug}/pacientes` },
      { icon: FaUserTie, label: 'Funcionários', href: `/c/${clinicSlug}/funcionarios` },
      { icon: FaListAlt, label: 'Serviços', href: `/c/${clinicSlug}/servicos` },
      { icon: FaStickyNote, label: 'Lembretes', href: `/c/${clinicSlug}/lembretes` },
      { icon: FaMoneyBillWave, label: 'Financeiro', href: `/c/${clinicSlug}/financeiro` },
      { icon: FaCog, label: 'Configurações', href: `/c/${clinicSlug}/configuracoes` },
    ];
  }, [clinicSlug]);

  const handleCollapse = () => {
    const newCollapsed = !isCollapsed;
    onCollapse?.(newCollapsed);
  };

  const isActiveLink = (href: string) => pathname.startsWith(href);

  const handleNavigation = (href: string) => {
    router.push(href);
  };

  const handleAddAppointment = (appointmentData: AppointmentPayload) => {
    const id = appointments.length + 1;
    const appointment: Appointment = {
      id,
      patient_id: appointmentData.patient_id,
      doctor_id: appointmentData.doctor_id,
      start_time: appointmentData.start_time,
      end_time: appointmentData.end_time,
      status: 'scheduled',
      notes: appointmentData.notes,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    setAppointments([...appointments, appointment]);
    setIsModalOpen(false);
  };

  return (
    <aside
      className={`
        bg-[#2A3547] fixed top-0 left-0 z-40
        h-screen overflow-y-auto overflow-x-hidden
        transition-all duration-300 ease-in-out
        flex flex-col
        ${isCollapsed ? 'w-[72px]' : 'w-64'}
        scrollbar-thin scrollbar-thumb-[#323e4f] scrollbar-track-[#2A3547]
      `}
    >
      {/* Logo */}
      <div className="flex items-center h-16 px-4 flex-shrink-0 sticky top-0 bg-[#2A3547] z-50">
        <div className={`flex items-center ${isCollapsed ? 'justify-center w-full' : ''}`}>
          <FaStethoscope className="w-6 h-6 text-blue-400 shrink-0" />
          <div
            className={`
              ml-3 overflow-hidden whitespace-nowrap
              transition-all duration-300 ease-in-out
              ${isCollapsed ? 'w-0 opacity-0' : 'w-32 opacity-100'}
            `}
          >
            <span className="font-medium text-white">Clínica Casa</span>
          </div>
        </div>
      </div>

      {/* Novo Agendamento */}
      <div className={`mt-4 mb-4 flex-shrink-0 ${isCollapsed ? 'px-2' : 'px-4'}`}>
        <button
          onClick={() => setIsModalOpen(true)}
          className={`
            bg-blue-500 hover:bg-blue-600 text-white rounded-lg
            transition-all duration-300 ease-in-out
            flex items-center
            ${isCollapsed 
              ? 'w-[44px] h-[44px] justify-center' 
              : 'w-full py-2.5 px-4'
            }
          `}
          style={isCollapsed ? { margin: '0 auto' } : undefined}
        >
          <FaPlus className={`${isCollapsed ? 'w-5 h-5' : 'w-4 h-4'}`} />
          <span
            className={`
              ml-2 whitespace-nowrap
              transition-all duration-300 ease-in-out
              ${isCollapsed ? 'w-0 opacity-0 hidden' : 'w-auto opacity-100'}
            `}
          >
            Novo Agendamento
          </span>
        </button>
      </div>

      {/* Menu Items */}
      <nav className={`flex-1 ${isCollapsed ? 'px-2' : 'px-3'}`}>
        {menuItems.map((item, index) => {
          const Icon = item.icon;
          const isActive = isActiveLink(item.href);
          return (
            <button
              key={index}
              onClick={() => handleNavigation(item.href)}
              className={`
                flex items-center rounded-lg
                transition-all duration-200 ease-in-out
                hover:bg-[#323e4f] group relative
                ${isCollapsed 
                  ? 'w-[44px] h-[44px] justify-center mx-auto' 
                  : 'w-full px-3 py-2.5'
                }
                ${isActive ? 'bg-[#323e4f] text-blue-400' : 'text-gray-300'}
                mb-1
              `}
            >
              <Icon className={`w-5 h-5 shrink-0`} />
              <span
                className={`
                  ml-3 whitespace-nowrap text-sm
                  transition-all duration-300 ease-in-out
                  ${isCollapsed ? 'w-0 opacity-0 hidden' : 'w-auto opacity-100'}
                `}
              >
                {item.label}
              </span>
              {isCollapsed && (
                <div className="
                  absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-sm
                  rounded opacity-0 group-hover:opacity-100
                  transition-opacity duration-200
                  pointer-events-none
                  whitespace-nowrap
                  z-50
                ">
                  {item.label}
                </div>
              )}
            </button>
          );
        })}
      </nav>

      <NewAppointmentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleAddAppointment}
        selectedDate={selectedDate}
        doctors={doctors}
        patients={patients}
      />
    </aside>
  );
};

export default Sidebar;