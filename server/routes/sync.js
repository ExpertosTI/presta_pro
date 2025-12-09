const express = require('express');
const router = express.Router();
const { PrismaClient } = require('../generated/prisma');
const prisma = new PrismaClient();

// POST /api/sync - Recibe datos masivos de localStorage para migración inicial
router.post('/', async (req, res) => {
    try {
        const { clients, loans, receipts, expenses } = req.body;
        const tenantId = req.user.tenantId;

        console.log(`Starting sync for tenant ${tenantId}. Clients: ${clients?.length}, Loans: ${loans?.length}`);

        // Usar transacción para asegurar integridad
        const result = await prisma.$transaction(async (tx) => {
            // 1. Migrar Clientes
            const mapClientId = new Map(); // Map oldId (localStorage) -> newId (DB)

            if (clients && Array.isArray(clients)) {
                for (const c of clients) {
                    // Intentar buscar si ya existe por nombre o teléfono para evitar duplicados obvios, 
                    // pero para la migración inicial asumiremos que es limpio o que queremos importar todo.
                    // Para ser seguros, creamos nuevos.
                    const createdClient = await tx.client.create({
                        data: {
                            name: c.name || 'Sin Nombre',
                            phone: c.phone,
                            address: c.address,
                            idNumber: c.idNumber, // Asegurar que coincida con schema
                            email: c.email,
                            notes: c.notes,
                            tenantId: tenantId
                            // No importamos photoUrl local si es blob, solo si es URL remota. 
                            // Si es base64 podria ser muy pesado, ver estrategia.
                        }
                    });
                    mapClientId.set(c.id, createdClient.id); // Guardar mapeo para loans
                }
            }

            // 2. Migrar Préstamos
            const mapLoanId = new Map();

            if (loans && Array.isArray(loans)) {
                for (const l of loans) {
                    // Buscar el ID real del cliente
                    const dbClientId = mapClientId.get(l.clientId);

                    if (dbClientId) {
                        const createdLoan = await tx.loan.create({
                            data: {
                                tenantId: tenantId,
                                clientId: dbClientId,
                                amount: parseFloat(l.amount),
                                rate: parseFloat(l.rate),
                                term: parseInt(l.term),
                                frequency: l.frequency,
                                startDate: new Date(l.startDate),
                                status: l.status,
                                // Crear cuotas (installments)
                                installments: {
                                    create: l.schedule.map(s => ({
                                        number: s.number,
                                        date: new Date(s.date),
                                        payment: parseFloat(s.payment),
                                        interest: parseFloat(s.interest),
                                        principal: parseFloat(s.principal),
                                        balance: parseFloat(s.balance),
                                        status: s.status,
                                        paidAmount: s.paidAmount ? parseFloat(s.paidAmount) : null,
                                        paidDate: s.paidDate ? new Date(s.paidDate) : null
                                    }))
                                }
                            }
                        });
                        mapLoanId.set(l.id, createdLoan.id);
                    }
                }
            }

            // 3. Migrar Recibos (Payments/Receipts)
            if (receipts && Array.isArray(receipts)) {
                for (const r of receipts) {
                    const dbLoanId = mapLoanId.get(r.loanId);
                    // Si no encontramos el préstamo (quizás ya borrado o no migrado), lo saltamos
                    if (dbLoanId) {
                        await tx.receipt.create({
                            data: {
                                tenantId: tenantId,
                                loanId: dbLoanId,
                                clientId: r.clientId ? mapClientId.get(r.clientId) : undefined, // Ojo si clientId es null
                                amount: parseFloat(r.amount),
                                date: new Date(r.date),
                                installmentNumber: r.installmentNumber || 0
                            }
                        });
                    }
                }
            }

            return {
                clientsMigrated: clients?.length || 0,
                loansMigrated: loans?.length || 0
            };
        });

        res.json({ success: true, stats: result });
    } catch (error) {
        console.error('Error in sync:', error);
        res.status(500).json({ error: 'Error durante la sincronización de datos: ' + error.message });
    }
});

module.exports = router;
