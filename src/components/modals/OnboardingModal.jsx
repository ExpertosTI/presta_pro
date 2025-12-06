import { useState } from 'react';
import { CheckCircle, Shield, Zap, ArrowRight, X } from 'lucide-react';

export default function OnboardingModal({ open, onClose, userName }) {
    const [step, setStep] = useState(1);

    if (!open) return null;

    const nextStep = () => setStep(step + 1);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            ></div>

            {/* Modal Content */}
            <div className="relative w-full max-w-lg bg-white dark:bg-slate-800 rounded-2xl shadow-2xl overflow-hidden transform transition-all border border-slate-200 dark:border-slate-700">

                {/* Progress Bar */}
                <div className="h-1 bg-slate-100 dark:bg-slate-900 w-full">
                    <div
                        className="h-full bg-blue-600 transition-all duration-500 ease-out"
                        style={{ width: `${(step / 3) * 100}%` }}
                    ></div>
                </div>

                <div className="p-8">
                    {/* Step 1: Welcome & Verification */}
                    {step === 1 && (
                        <div className="space-y-6 animate-fadeIn">
                            <div className="flex justify-center">
                                <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-2">
                                    <Shield className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                                </div>
                            </div>
                            <div className="text-center space-y-2">
                                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                                    ¡Bienvenido, {userName}!
                                </h2>
                                <p className="text-slate-600 dark:text-slate-300">
                                    Tu cuenta ha sido creada exitosamente. Hemos enviado un enlace de activación a tu correo.
                                </p>
                            </div>

                            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-lg p-4 text-sm text-amber-800 dark:text-amber-200">
                                <p className="font-semibold mb-1">⚠️ Importante:</p>
                                Tienes <strong>3 horas</strong> para confirmar tu correo. Mientras tanto, tienes acceso completo para configurar tu espacio.
                            </div>

                            <button
                                onClick={nextStep}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
                            >
                                Entendido
                                <ArrowRight className="w-4 h-4" />
                            </button>
                        </div>
                    )}

                    {/* Step 2: Key Features & Value */}
                    {step === 2 && (
                        <div className="space-y-6 animate-fadeIn">
                            <div className="flex justify-center">
                                <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mb-2">
                                    <Zap className="w-8 h-8 text-purple-600 dark:text-purple-400" />
                                </div>
                            </div>
                            <div className="text-center space-y-2">
                                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                                    Potencia tu Financiera
                                </h2>
                                <p className="text-slate-600 dark:text-slate-300">
                                    Aquí tienes algunas cosas que puedes hacer de inmediato:
                                </p>
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-start gap-3 bg-slate-50 dark:bg-slate-700/50 p-3 rounded-lg">
                                    <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 rounded-full text-xs font-bold">1</span>
                                    <p className="text-sm text-slate-700 dark:text-slate-300">Registra tus <strong>Clientes</strong> y crea sus perfiles.</p>
                                </div>
                                <div className="flex items-start gap-3 bg-slate-50 dark:bg-slate-700/50 p-3 rounded-lg">
                                    <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-300 rounded-full text-xs font-bold">2</span>
                                    <p className="text-sm text-slate-700 dark:text-slate-300">Crea <strong>Préstamos</strong> y define las cuotas automáticamente.</p>
                                </div>
                                <div className="flex items-start gap-3 bg-slate-50 dark:bg-slate-700/50 p-3 rounded-lg">
                                    <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-300 rounded-full text-xs font-bold">3</span>
                                    <p className="text-sm text-slate-700 dark:text-slate-300">Usa el <strong>Asistente IA</strong> (abajo a la derecha) para cualquier duda operativa.</p>
                                </div>
                            </div>

                            <button
                                onClick={nextStep}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
                            >
                                Siguiente
                                <ArrowRight className="w-4 h-4" />
                            </button>
                        </div>
                    )}

                    {/* Step 3: Ready */}
                    {step === 3 && (
                        <div className="space-y-6 animate-fadeIn">
                            <div className="flex justify-center">
                                <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-2">
                                    <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
                                </div>
                            </div>
                            <div className="text-center space-y-4">
                                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                                    ¡Todo Listo!
                                </h2>
                                <p className="text-slate-600 dark:text-slate-300">
                                    Ya puedes empezar a gestionar tu negocio de manera eficiente.
                                </p>
                                <div className="text-sm text-slate-500 italic">
                                    "El éxito llega a quienes están preparados."
                                </div>
                            </div>

                            <button
                                onClick={onClose}
                                className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-emerald-900/20 transform transition-all hover:scale-[1.02]"
                            >
                                Ir al Panel de Control
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
