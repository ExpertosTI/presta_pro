/**
 * Client credit balance helpers (cancel loan → credit, apply on new loan).
 */

const prisma = require('../lib/prisma');

/**
 * Add credit to client and write ledger entry (within optional tx).
 */
async function addClientCredit({
  tx = prisma,
  tenantId,
  clientId,
  amount,
  reason,
  loanId = null,
}) {
  const credit = Math.round((parseFloat(amount) || 0) * 100) / 100;
  if (credit <= 0) {
    const client = await tx.client.findFirst({ where: { id: clientId, tenantId } });
    return { client, ledger: null, credited: 0 };
  }

  const client = await tx.client.update({
    where: { id: clientId },
    data: { creditBalance: { increment: credit } },
  });

  const ledger = await tx.clientCreditLedger.create({
    data: {
      tenantId,
      clientId,
      amount: credit,
      balanceAfter: client.creditBalance,
      reason,
      loanId,
    },
  });

  return { client, ledger, credited: credit };
}

/**
 * Consume client credit (negative ledger). Throws if insufficient.
 */
async function useClientCredit({
  tx = prisma,
  tenantId,
  clientId,
  amount,
  reason,
  loanId = null,
}) {
  const use = Math.round((parseFloat(amount) || 0) * 100) / 100;
  if (use <= 0) {
    const client = await tx.client.findFirst({ where: { id: clientId, tenantId } });
    return { client, ledger: null, used: 0 };
  }

  const current = await tx.client.findFirst({ where: { id: clientId, tenantId } });
  if (!current) throw new Error('Cliente no encontrado');
  if ((current.creditBalance || 0) + 1e-9 < use) {
    throw new Error('Crédito insuficiente del cliente');
  }

  const client = await tx.client.update({
    where: { id: clientId },
    data: { creditBalance: { decrement: use } },
  });

  const ledger = await tx.clientCreditLedger.create({
    data: {
      tenantId,
      clientId,
      amount: -use,
      balanceAfter: client.creditBalance,
      reason,
      loanId,
    },
  });

  return { client, ledger, used: use };
}

module.exports = {
  addClientCredit,
  useClientCredit,
};
