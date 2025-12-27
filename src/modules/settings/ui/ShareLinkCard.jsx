import React, { useState, useEffect } from 'react';
import { Share2, Copy, Check, QrCode, ExternalLink, Download, RefreshCw } from 'lucide-react';

/**
 * ShareLinkCard - Component to display and share the public loan application link
 * Includes QR code generation and copy/share functionality
 * 
 * IMPORTANT: This component uses the tenantSlug prop directly.
 * Parent component is responsible for providing the correct slug.
 */
export const ShareLinkCard = ({ tenantSlug, companyName }) => {
    const [copied, setCopied] = useState(false);
    const [qrLoaded, setQrLoaded] = useState(false);

    // Construct the public link - use prop directly
    const baseUrl = window.location.origin;
    const publicLink = tenantSlug ? `${baseUrl}/aplicar/${tenantSlug}` : null;

    // QR code URL - regenerates when tenantSlug changes
    const qrUrl = tenantSlug
        ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(publicLink)}&bgcolor=1e293b&color=a78bfa`
        : null;

    // Reset QR loaded state when slug changes
    useEffect(() => {
        setQrLoaded(false);
    }, [tenantSlug]);

    const handleCopy = async () => {
        if (!publicLink) return;
        try {
            await navigator.clipboard.writeText(publicLink);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    const handleShare = async () => {
        if (!publicLink) return;
        if (navigator.share) {
            try {
                await navigator.share({
                    title: `Solicitar préstamo - ${companyName || 'RenKredit'}`,
                    text: `Solicita tu préstamo fácilmente con ${companyName || 'nosotros'}`,
                    url: publicLink
                });
            } catch (err) {
                if (err.name !== 'AbortError') {
                    handleCopy();
                }
            }
        } else {
            handleCopy();
        }
    };

    const handleDownloadQR = () => {
        if (qrUrl) {
            const link = document.createElement('a');
            link.href = qrUrl;
            link.download = `qr-solicitud-${tenantSlug}.png`;
            link.click();
        }
    };

    // Show message if no slug available
    if (!tenantSlug) {
        return (
            <div className="bg-gradient-to-br from-purple-900/30 to-indigo-900/30 rounded-2xl p-6 border border-purple-500/20">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center">
                        <QrCode className="w-5 h-5 text-purple-400" />
                    </div>
                    <div>
                        <h3 className="font-bold text-white">Link de Solicitud Pública</h3>
                        <p className="text-sm text-yellow-400">⚠️ Guarda la configuración para generar el link</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-gradient-to-br from-purple-900/30 to-indigo-900/30 rounded-2xl p-6 border border-purple-500/20">
            <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center">
                    <QrCode className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                    <h3 className="font-bold text-white">Link de Solicitud Pública</h3>
                    <p className="text-sm text-gray-400">Comparte este link con tus clientes</p>
                </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
                {/* QR Code */}
                <div className="flex flex-col items-center">
                    <div className="bg-slate-800 p-3 rounded-xl mb-3">
                        {qrUrl ? (
                            <img
                                src={qrUrl}
                                alt="QR Code"
                                className={`w-40 h-40 rounded-lg transition-opacity ${qrLoaded ? 'opacity-100' : 'opacity-50'}`}
                                onLoad={() => setQrLoaded(true)}
                            />
                        ) : (
                            <div className="w-40 h-40 bg-slate-700 rounded-lg animate-pulse flex items-center justify-center">
                                <QrCode className="w-10 h-10 text-slate-600" />
                            </div>
                        )}
                    </div>
                    <button
                        onClick={handleDownloadQR}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-gray-300 rounded-lg text-sm transition-colors"
                    >
                        <Download className="w-4 h-4" />
                        Descargar QR
                    </button>
                </div>

                {/* Link and Actions */}
                <div className="flex flex-col justify-center">
                    {/* Link Display */}
                    <div className="bg-slate-800/50 rounded-xl p-3 mb-4">
                        <p className="text-xs text-gray-500 mb-1">URL del formulario:</p>
                        <p className="text-purple-300 text-sm break-all font-mono">{publicLink}</p>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col gap-2">
                        <button
                            onClick={handleCopy}
                            className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold transition-all ${copied
                                ? 'bg-green-600 text-white'
                                : 'bg-slate-700 hover:bg-slate-600 text-white'
                                }`}
                        >
                            {copied ? (
                                <>
                                    <Check className="w-5 h-5" />
                                    ¡Copiado!
                                </>
                            ) : (
                                <>
                                    <Copy className="w-5 h-5" />
                                    Copiar Link
                                </>
                            )}
                        </button>

                        <button
                            onClick={handleShare}
                            className="flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-semibold transition-colors"
                        >
                            <Share2 className="w-5 h-5" />
                            Compartir
                        </button>

                        <a
                            href={publicLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-gray-300 rounded-xl font-semibold transition-colors"
                        >
                            <ExternalLink className="w-5 h-5" />
                            Abrir en nueva pestaña
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ShareLinkCard;
