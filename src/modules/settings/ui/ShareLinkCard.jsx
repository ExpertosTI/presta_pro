import React, { useState, useEffect } from 'react';
import { Share2, Copy, Check, QrCode, ExternalLink, Download } from 'lucide-react';

/**
 * ShareLinkCard - Component to display and share the public loan application link
 * Includes QR code generation and copy/share functionality
 */
export const ShareLinkCard = ({ tenantSlug: propSlug, companyName }) => {
    const [copied, setCopied] = useState(false);
    const [qrDataUrl, setQrDataUrl] = useState(null);
    const [tenantSlug, setTenantSlug] = useState(null);
    const [loading, setLoading] = useState(true);

    // Construct the public link
    const baseUrl = window.location.origin;
    const publicLink = tenantSlug ? `${baseUrl}/aplicar/${tenantSlug}` : null;

    // Sync propSlug to state whenever it changes
    useEffect(() => {
        if (propSlug) {
            setTenantSlug(propSlug);
            setLoading(false);
        }
    }, [propSlug]);

    // Fetch tenant slug from backend on mount if not provided via prop
    useEffect(() => {
        // Skip if we already have a slug from props
        if (propSlug) return;

        const fetchTenantSlug = async () => {
            try {
                const token = localStorage.getItem('authToken');
                if (!token) {
                    setLoading(false);
                    return;
                }

                const response = await fetch('/api/settings', {
                    headers: { Authorization: `Bearer ${token}` }
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data.tenantSlug) {
                        setTenantSlug(data.tenantSlug);
                    } else if (data.companyName) {
                        // Generate slug from company name as fallback
                        const generatedSlug = data.companyName
                            .toLowerCase()
                            .trim()
                            .normalize('NFD')
                            .replace(/[\u0300-\u036f]/g, '')
                            .replace(/[^a-z0-9\s-]/g, '')
                            .replace(/\s+/g, '-')
                            .replace(/-+/g, '-');
                        setTenantSlug(generatedSlug);
                    }
                }
            } catch (err) {
                console.error('Error fetching tenant slug:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchTenantSlug();
    }, []); // Only run on mount

    // Generate QR code using external API (no dependencies needed)
    useEffect(() => {
        if (tenantSlug && publicLink) {
            // Using QR Server API - free, no signup required
            const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(publicLink)}&bgcolor=1e293b&color=a78bfa`;
            setQrDataUrl(qrUrl);
        }
    }, [tenantSlug, publicLink]);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(publicLink);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    const handleShare = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: `Solicitar préstamo - ${companyName || 'RenKredit'}`,
                    text: `Solicita tu préstamo fácilmente con ${companyName || 'nosotros'}`,
                    url: publicLink
                });
            } catch (err) {
                if (err.name !== 'AbortError') {
                    // Fallback to copy
                    handleCopy();
                }
            }
        } else {
            // Fallback for browsers without Web Share API
            handleCopy();
        }
    };

    const handleDownloadQR = () => {
        if (qrDataUrl) {
            const link = document.createElement('a');
            link.href = qrDataUrl;
            link.download = `qr-solicitud-${tenantSlug}.png`;
            link.click();
        }
    };

    // Show loading or nothing while fetching
    if (loading) {
        return (
            <div className="bg-gradient-to-br from-purple-900/30 to-indigo-900/30 rounded-2xl p-6 border border-purple-500/20">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center">
                        <QrCode className="w-5 h-5 text-purple-400 animate-pulse" />
                    </div>
                    <div>
                        <h3 className="font-bold text-white">Link de Solicitud Pública</h3>
                        <p className="text-sm text-gray-400">Cargando...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (!tenantSlug) {
        return null;
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
                        {qrDataUrl ? (
                            <img
                                src={qrDataUrl}
                                alt="QR Code"
                                className="w-40 h-40 rounded-lg"
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
