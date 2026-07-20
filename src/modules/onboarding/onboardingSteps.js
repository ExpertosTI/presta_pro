/**
 * Interactive product tour — teaches what each area is for.
 * Does not remove or hide any features.
 */
export const ONBOARDING_STORAGE_KEY = 'prestapro_onboarding_v1';

export const ONBOARDING_STEPS = [
  {
    id: 'welcome',
    tab: 'dashboard',
    title: 'Bienvenido a Presta Pro',
    subtitle: 'Tu panel de control',
    body: 'Aquí ves el resumen del negocio: cartera, cobrado del día, alertas y accesos rápidos. Empieza siempre por aquí para saber cómo va el día.',
    tip: 'Tip: revisa el Dashboard cada mañana antes de salir a cobrar.',
  },
  {
    id: 'settings',
    tab: 'settings',
    title: 'Configura tu negocio',
    subtitle: 'Ajustes',
    body: 'Pon el nombre de tu empresa, logo, moneda, tasa de mora y preferencias de rutas. Estos datos salen en recibos y documentos.',
    tip: 'Hazlo una vez; después casi no lo tocas.',
  },
  {
    id: 'clients',
    tab: 'clients',
    title: 'Registra tus clientes',
    subtitle: 'Clientes',
    body: 'Aquí creas y editas personas o negocios. Sin cliente no puedes desembolsar un préstamo ni armar una ruta de cobro.',
    tip: 'Guarda teléfono, cédula y dirección para cobros y documentos.',
  },
  {
    id: 'loans',
    tab: 'loans',
    title: 'Crea préstamos',
    subtitle: 'Préstamos',
    body: 'Desembolsa préstamos fijos o abiertos, registra pagos y ve el calendario de cuotas. La Calculadora te sirve para simular antes de desembolsar.',
    tip: 'Flujo típico: Cliente → Préstamo → Cobro.',
  },
  {
    id: 'requests',
    tab: 'requests',
    title: 'Solicitudes (opcional)',
    subtitle: 'Pipeline de aprobación',
    body: 'Si alguien pide un préstamo y tú (u otro usuario) debe aprobarlo, usa Solicitudes. Luego conviertes la solicitud aprobada en préstamo.',
    tip: 'Si trabajas solo, puedes ir directo a Préstamos.',
  },
  {
    id: 'routes',
    tab: 'routes',
    title: 'Cobra en la calle',
    subtitle: 'Ruta de Cobros',
    body: 'Arma tu ruta del día, visita clientes, registra pagos con GPS y cierra la ruta. Es el corazón operativo del cobrador.',
    tip: 'Cada pago queda vinculado al cliente y al préstamo.',
  },
  {
    id: 'cuadre',
    tab: 'cuadre',
    title: 'Cuadra la caja del día',
    subtitle: 'Cuadre de Caja',
    body: 'Al final del día compara lo cobrado con lo esperado por cobrador. No es lo mismo que Reportes: el cuadre es operativo y diario.',
    tip: 'Cierra caja después de terminar la ruta.',
  },
  {
    id: 'money',
    tab: 'reports',
    title: 'Gastos, Reportes y Contabilidad',
    subtitle: 'Control financiero',
    body: 'Gastos: anota egresos. Reportes: KPIs del periodo y rendimiento de cobradores. Contabilidad: detalle de recibos, gastos y balance. Las tres se complementan.',
    tip: 'Dashboard = resumen rápido · Reportes/Contabilidad = análisis.',
  },
  {
    id: 'tools',
    tab: 'documents',
    title: 'Herramientas y equipo',
    subtitle: 'Documentos, Notas, RRHH, Cobradores',
    body: 'Documentos: pagarés y contratos. Notas: recordatorios personales. RRHH: empleados. Cobradores: usuarios de campo, permisos y comisiones. Suscripción: tu plan.',
    tip: 'No hace falta usarlas el primer día; están cuando las necesites.',
  },
  {
    id: 'ai',
    tab: 'dashboard',
    title: 'Tu Asistente IA',
    subtitle: 'Bot flotante',
    body: 'El botón redondo de abajo a la derecha responde preguntas con datos reales y puede abrirte Clientes, Préstamos, Rutas y más. Úsalo cuando no sepas dónde está algo.',
    tip: 'Pregunta cosas como: “¿cuánto cobré hoy?” o “lléname a clientes”.',
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
