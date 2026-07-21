/**
 * Interactive product tour v3 — includes WhatsApp QR linking.
 */
import {
  LayoutDashboard,
  Settings,
  Users,
  Receipt,
  FileText,
  MapPin,
  Wallet,
  PieChart,
  FileDigit,
  Sparkles,
  Rocket,
  MessageCircle,
} from 'lucide-react';

export const ONBOARDING_STORAGE_KEY = 'prestapro_onboarding_v3';

export const ONBOARDING_STEPS = [
  {
    id: 'welcome',
    tab: 'dashboard',
    target: null,
    phase: 'intro',
    icon: Rocket,
    accent: 'from-blue-600 to-indigo-600',
    title: 'Tu negocio de préstamos, en orden',
    subtitle: 'Guía rápida · 2 minutos',
    body: 'Esta guía te muestra el flujo real del día a día. Al terminar sabrás dónde configurar, vincular WhatsApp, prestar, cobrar y controlar la caja.',
    bullets: [
      'Primero configuras tu empresa y WhatsApp',
      'Luego clientes → préstamos → cobros',
      'Al final del día: cuadre y reportes',
    ],
    tip: null,
    cta: 'Empezar guía',
  },
  {
    id: 'settings',
    tab: 'settings',
    target: 'settings',
    icon: Settings,
    accent: 'from-slate-600 to-slate-800',
    title: 'Ponle cara a tu negocio',
    subtitle: 'Configuración',
    body: 'Nombre, logo, mora y preferencias salen en recibos, contratos y WhatsApp. Hazlo una vez y olvídate.',
    bullets: [
      'Nombre y logo de la empresa',
      'Tasa de mora y días de gracia',
      'WhatsApp de la empresa (recibos)',
    ],
    tip: 'Si cambias el logo, se actualiza en los próximos comprobantes.',
  },
  {
    id: 'whatsapp',
    tab: 'settings',
    target: 'whatsapp-qr',
    icon: MessageCircle,
    accent: 'from-emerald-500 to-green-600',
    title: 'Vincula WhatsApp con el QR',
    subtitle: 'Instancia Evolution',
    body: 'Escanea el código QR con tu teléfono para conectar la instancia. Así envías recibos y alertas a clientes automáticamente.',
    bullets: [
      'Abre WhatsApp → Dispositivos vinculados',
      'Escanea el QR de abajo',
      'Cuando diga Conectado, ya puedes enviar',
    ],
    tip: 'El QR caduca en ~1 minuto. Usa “Actualizar QR” si se vence.',
    showWhatsAppQr: true,
  },
  {
    id: 'clients',
    tab: 'clients',
    target: 'clients',
    icon: Users,
    accent: 'from-violet-600 to-purple-600',
    title: 'Todo empieza con un cliente',
    subtitle: 'Clientes',
    body: 'Sin cliente no hay préstamo ni ruta. Guarda teléfono y cédula: sirven para cobros, documentos y WhatsApp.',
    bullets: [
      'Crea el cliente con datos completos',
      'Asigna cobrador si trabajas en equipo',
      'El crédito a favor aparece aquí si cancelas un préstamo',
    ],
    tip: 'Flujo de oro: Cliente → Préstamo → Cobro.',
  },
  {
    id: 'loans',
    tab: 'loans',
    target: 'loans',
    icon: Receipt,
    accent: 'from-blue-600 to-cyan-600',
    title: 'Desembolsa con control',
    subtitle: 'Préstamos',
    body: 'Cuotas fijas o abiertos (abonos libres). Puedes usar tasa 0% (sin interés), editar si no hay pagos, o cancelar y dejar el pagado como crédito.',
    bullets: [
      'Fijo = calendario de cuotas',
      'Abierto = el cliente abona cuando puede',
      'Tasa 0 = préstamo sin interés',
    ],
    tip: 'Simula primero con la Calculadora si dudas del monto de cuota.',
  },
  {
    id: 'requests',
    tab: 'requests',
    target: 'requests',
    icon: FileText,
    accent: 'from-amber-500 to-orange-600',
    title: 'Cuando hay que aprobar',
    subtitle: 'Solicitudes',
    body: 'Útil si alguien pide crédito y tú (u otro usuario) debe revisar antes de desembolsar. Si trabajas solo, puedes saltar directo a Préstamos.',
    bullets: [
      'Recibe la solicitud',
      'Aprueba o rechaza',
      'La aprobada se convierte en préstamo',
    ],
    tip: 'Opcional: no bloquea el flujo si no la usas.',
  },
  {
    id: 'routes',
    tab: 'routes',
    target: 'routes',
    icon: MapPin,
    accent: 'from-emerald-600 to-teal-600',
    title: 'El corazón del cobro',
    subtitle: 'Ruta de Cobros',
    body: 'Arma la ruta del día, visita, cobra con GPS y cierra. Cada pago genera recibo (impresión y WhatsApp).',
    bullets: [
      'Ordena paradas del día',
      'Registra pago en el punto',
      'Cierra la ruta al terminar',
    ],
    tip: 'El recibo se puede enviar al cliente por WhatsApp al instante.',
  },
  {
    id: 'cuadre',
    tab: 'cuadre',
    target: 'cuadre',
    icon: Wallet,
    accent: 'from-rose-500 to-pink-600',
    title: '¿Cuadra el efectivo?',
    subtitle: 'Cuadre de Caja',
    body: 'Cierre diario operativo: lo cobrado vs lo esperado por cobrador. No es lo mismo que Reportes (eso es del periodo).',
    bullets: [
      'Revisa cobrado del día',
      'Compara por cobrador',
      'Cierra caja cuando todo cuadre',
    ],
    tip: 'Hazlo siempre después de cerrar la ruta.',
  },
  {
    id: 'money',
    tab: 'reports',
    target: 'reports',
    icon: PieChart,
    accent: 'from-indigo-600 to-blue-700',
    title: 'Mira el negocio completo',
    subtitle: 'Gastos · Reportes · Contabilidad',
    body: 'Gastos registra egresos. Reportes da KPIs y rendimiento. Contabilidad detalla recibos y balance. Dashboard es el resumen; aquí está el análisis.',
    bullets: [
      'Gastos → anota salidas',
      'Reportes → periodo y cobradores',
      'Contabilidad → detalle fino',
    ],
    tip: 'Dashboard = hoy. Reportes = el mes.',
  },
  {
    id: 'tools',
    tab: 'documents',
    target: 'documents',
    icon: FileDigit,
    accent: 'from-slate-600 to-zinc-700',
    title: 'Herramientas cuando las necesites',
    subtitle: 'Documentos · Notas · RRHH · Cobradores',
    body: 'No hace falta el día 1. Documentos para pagarés/contratos, Cobradores para permisos de campo, Notas y RRHH para el resto del equipo.',
    bullets: [
      'Documentos legales del cliente',
      'Cobradores con login y permisos',
      'Suscripción = tu plan actual',
    ],
    tip: 'Todo sigue en el menú; esta guía no oculta nada.',
  },
  {
    id: 'ai',
    tab: 'dashboard',
    target: 'ai-bot',
    icon: Sparkles,
    accent: 'from-fuchsia-600 to-violet-600',
    title: 'Tu copiloto siempre disponible',
    subtitle: 'Asistente IA',
    body: 'El botón flotante responde con datos reales y te lleva a secciones. Ideal cuando no recuerdas dónde está algo.',
    bullets: [
      '“¿Cuánto cobré hoy?”',
      '“Llévame a clientes”',
      '“¿Cómo va la ruta?”',
    ],
    tip: 'También puedes reabrir esta guía desde el menú de tu avatar.',
  },
  {
    id: 'finish',
    tab: 'dashboard',
    target: null,
    phase: 'outro',
    icon: LayoutDashboard,
    accent: 'from-emerald-500 to-teal-600',
    title: 'Listo para operar',
    subtitle: 'Ya conoces el mapa',
    body: 'Recuerda el camino: Configura + WhatsApp → Cliente → Préstamo → Ruta → Cuadre. El resto está ahí cuando lo necesites.',
    bullets: [
      'Reabre la guía: avatar → Ver guía de la app',
      'El QR de WhatsApp también está en Ajustes',
      'Empieza creando tu primer cliente',
    ],
    tip: null,
    cta: 'Ir al Dashboard',
  },
];

export function getOnboardingKey(userId) {
  return userId ? `${ONBOARDING_STORAGE_KEY}_${userId}` : ONBOARDING_STORAGE_KEY;
}

export function hasCompletedOnboarding(userId) {
  try {
    return localStorage.getItem(getOnboardingKey(userId)) === 'done';
  } catch {
    return true;
  }
}

export function markOnboardingDone(userId) {
  try {
    localStorage.setItem(getOnboardingKey(userId), 'done');
  } catch {
    /* ignore quota */
  }
}

export function resetOnboarding(userId) {
  try {
    localStorage.removeItem(getOnboardingKey(userId));
  } catch {
    /* ignore */
  }
}
