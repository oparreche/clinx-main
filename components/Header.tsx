'use client';

import { useState, useEffect, useRef } from 'react';
import { FaBell, FaCog, FaSearch, FaUserCircle, FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import { useAuth } from '@/auth/context/AuthContext';

interface Notification {
  id: number;
  title: string;
  description: string;
  time: string;
  read: boolean;
}

interface HeaderProps {
  isSidebarCollapsed: boolean;
  onSidebarCollapse: (collapsed: boolean) => void;
}

const Header = ({ isSidebarCollapsed, onSidebarCollapse }: HeaderProps) => {
  const { logout } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const [notifications] = useState<Notification[]>([
    {
      id: 1,
      title: 'Nova Consulta Agendada',
      description: 'Carlos Silva - 14:00',
      time: '5 min atrás',
      read: false,
    },
    {
      id: 2,
      title: 'Lembrete',
      description: 'Reunião com equipe às 15:00',
      time: '1 hora atrás',
      read: false,
    },
    {
      id: 3,
      title: 'Pagamento Recebido',
      description: 'Maria Santos - R$ 150,00',
      time: '2 horas atrás',
      read: true,
    },
  ]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <header className={`
      fixed top-0 right-0 z-50
      h-16 bg-white shadow-sm
      transition-all duration-300
      flex items-center
      ${isSidebarCollapsed ? 'left-[72px]' : 'left-64'}
    `}>
      {/* Collapse Button */}
      <button
        onClick={() => onSidebarCollapse(!isSidebarCollapsed)}
        className="
          bg-blue-500 text-white p-1.5 rounded-full 
          hover:bg-blue-600 hover:scale-110
          transition-all duration-200 ease-in-out
          shadow-lg border-2 border-white
          absolute -left-4 top-5
          z-50
        "
        aria-label={isSidebarCollapsed ? 'Expandir menu' : 'Recolher menu'}
      >
        {isSidebarCollapsed ? (
          <FaChevronRight className="w-3.5 h-3.5" />
        ) : (
          <FaChevronLeft className="w-3.5 h-3.5" />
        )}
      </button>

      <div className="w-full px-4">
        <div className="flex justify-between items-center h-full">
          {/* Search Bar */}
          <div className="flex-1 max-w-2xl flex items-center gap-4">
            <div className="flex-1 relative ml-6">
              <input
                type="text"
                placeholder="Buscar..."
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:border-blue-500"
              />
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            </div>
            <select className="px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:border-blue-500 bg-white">
              <option>UNIDADE 1</option>
              <option>UNIDADE 2</option>
            </select>
          </div>

          {/* Right Side Icons */}
          <div className="flex items-center space-x-4">
            <div className="relative" ref={notificationsRef}>
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 rounded-lg hover:bg-gray-100 relative transition-colors duration-200"
                aria-label={`Notificações ${unreadCount > 0 ? `(${unreadCount} não lidas)` : ''}`}
              >
                <FaBell className="h-6 w-6 text-gray-500" />
                {unreadCount > 0 && (
                  <span className="absolute top-0 right-0 transform translate-x-1/2 -translate-y-1/2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg py-1 z-50 border border-gray-200">
                  <div className="px-4 py-2 border-b border-gray-200">
                    <h3 className="text-sm font-semibold text-gray-900">Notificações</h3>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={`px-4 py-3 hover:bg-gray-50 transition-colors duration-200 ${
                          !notification.read ? 'bg-blue-50' : ''
                        }`}
                      >
                        <p className="text-sm font-medium text-gray-900">{notification.title}</p>
                        <p className="text-sm text-gray-500">{notification.description}</p>
                        <p className="text-xs text-gray-400 mt-1">{notification.time}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors duration-200"
              >
                <FaUserCircle className="h-6 w-6 text-gray-500" />
              </button>

              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-1 z-50 border border-gray-200">
                  <a
                    href="#profile"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors duration-200"
                  >
                    Meu Perfil
                  </a>
                  <a
                    href="#settings"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors duration-200"
                  >
                    Configurações
                  </a>
                  <hr className="my-1 border-gray-200" />
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      logout();
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100 transition-colors duration-200"
                  >
                    Sair
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;