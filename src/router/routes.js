import {
  LayoutDashboard,
  Users,
  Wallet,
  Receipt,
  PieChart,
  Settings,
  FileText,
  Calculator,
  BrainCircuit,
  MapPin,
  FileDigit,
  UserCheck,
  Bell,
  CreditCard,
  Rocket,
  Shield
} from 'lucide-react';

export const ROUTES = [
  // Principal
  { id: 'dashboard', label: 'Dashboard', title: 'Panel de Control', icon: LayoutDashboard, section: 'principal' },
  { id: 'routes', label: 'Ruta de Cobros', title: 'Ruta de Cobros', icon: MapPin, section: 'principal', dynamicBadge: 'routeActive' },
  { id: 'cuadre', label: 'Cuadre de Caja', title: 'Cuadre de Caja', icon: Receipt, section: 'principal' },

  // Operaciones
  { id: 'clients', label: 'Clientes', title: 'Clientes', icon: Users, section: 'operaciones' },
  { id: 'loans', label: 'Préstamos', title: 'Préstamos', icon: Receipt, section: 'operaciones', badgeKey: 'activeLoansCount' },
  { id: 'requests', label: 'Solicitudes', title: 'Solicitudes', icon: FileText, section: 'operaciones', badgeKey: 'pendingRequestsCount' },
  { id: 'expenses', label: 'Gastos', title: 'Gastos', icon: PieChart, section: 'operaciones' },

  // Herramientas
  { id: 'documents', label: 'Documentos', title: 'Documentos', icon: FileDigit, section: 'herramientas' },
  { id: 'calc', label: 'Calculadora', title: 'Calculadora', icon: Calculator, section: 'herramientas' },
  { id: 'notes', label: 'Notas', title: 'Notas', icon: FileText, section: 'herramientas' },

  // Administración
  { id: 'reports', label: 'Reportes', title: 'Reportes', icon: PieChart, section: 'admin' },
  { id: 'hr', label: 'RRHH', title: 'Recursos Humanos', icon: UserCheck, section: 'admin' },
  { id: 'accounting', label: 'Contabilidad', title: 'Contabilidad', icon: Wallet, section: 'admin' },
  { id: 'collectors-manage', label: 'Cobradores', title: 'Cobradores', icon: Users, section: 'admin', badge: 'V2' },
  { id: 'admin-panel', label: 'Admin Panel', title: 'Admin Panel', icon: Shield, section: 'admin', requireRole: 'SUPER_ADMIN' },
  { id: 'pricing', label: 'Suscripción', title: 'Planes', icon: Rocket, section: 'admin', badge: 'Pro' },
  { id: 'settings', label: 'Configuración', title: 'Ajustes', icon: Settings, section: 'admin' },

  // Hidden (no sidebar, but routable)
  { id: 'notifications', label: 'Notificaciones', title: 'Notificaciones', icon: Bell, section: 'hidden' },
  { id: 'ai', label: 'Asistente IA', title: 'Asistente IA', icon: BrainCircuit, section: 'hidden' },
];

export const SECTION_LABELS = {
  principal: 'Principal',
  operaciones: 'Operaciones',
  herramientas: 'Herramientas',
  admin: 'Administración',
};

export function getRouteTitle(tabId) {
  const route = ROUTES.find(r => r.id === tabId);
  return route?.title || tabId.charAt(0).toUpperCase() + tabId.slice(1);
}

export function getSidebarRoutes(userRole) {
  return ROUTES.filter(r => {
    if (r.section === 'hidden') return false;
    if (r.requireRole && userRole !== r.requireRole) return false;
    return true;
  });
}
