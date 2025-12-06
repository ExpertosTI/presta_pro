import { useState, useEffect, useMemo } from 'react';
import { generateId } from '../utils/ids';
import { safeLoad } from '../utils/storage';
import { createLoanLogic, registerPaymentLogic } from '../logic/loanLogic';

const API_BASE_URL =
    import.meta.env.VITE_API_BASE_URL ||
    (import.meta.env.DEV
        ? 'http://localhost:4000'
        : (typeof window !== 'undefined' ? window.location.origin : ''));

export function useDataState() {
    const [clients, setClients] = useState([]);
    const [loans, setLoans] = useState(() => safeLoad('rt_loans', []));
    const [expenses, setExpenses] = useState(() => safeLoad('rt_expenses', []));
    const [requests, setRequests] = useState(() => safeLoad('rt_requests', []));
    const [notes, setNotes] = useState(() => safeLoad('rt_notes', []));
    const [receipts, setReceipts] = useState(() => safeLoad('rt_receipts', []));
    const [employees, setEmployees] = useState(() => safeLoad('rt_employees', []));
    const [routeClosings, setRouteClosings] = useState(() => safeLoad('rt_route_closings', []));
    const [collectors, setCollectors] = useState(() => safeLoad('rt_collectors', []));
    const [aiMetrics, setAiMetrics] = useState(null);

    const [systemSettings, setSystemSettings] = useState(() =>
        safeLoad('rt_settings', {
            companyName: 'Presta Pro',
            mainCurrency: 'DOP',
            defaultPenaltyRate: 5,
            themeColor: 'indigo',
            enableRouteClosing: true,
            enableRouteGpsNotification: true,
            includeFutureInstallmentsInRoutes: true,
        })
    );

    // Persistence
    // Persist other entities locally (clients/collectors vienen del backend SaaS)
    useEffect(() => localStorage.setItem('rt_loans', JSON.stringify(loans)), [loans]);
    useEffect(() => localStorage.setItem('rt_expenses', JSON.stringify(expenses)), [expenses]);
    useEffect(() => localStorage.setItem('rt_requests', JSON.stringify(requests)), [requests]);
    useEffect(() => localStorage.setItem('rt_notes', JSON.stringify(notes)), [notes]);
    useEffect(() => localStorage.setItem('rt_receipts', JSON.stringify(receipts)), [receipts]);
    useEffect(() => localStorage.setItem('rt_employees', JSON.stringify(employees)), [employees]);
    useEffect(() => localStorage.setItem('rt_route_closings', JSON.stringify(routeClosings)), [routeClosings]);
    useEffect(() => localStorage.setItem('rt_settings', JSON.stringify(systemSettings)), [systemSettings]);
    useEffect(() => localStorage.setItem('rt_collectors', JSON.stringify(collectors)), [collectors]);

    const dbData = useMemo(
        () => ({ clients, loans, expenses, requests, notes, receipts, employees, collectors, systemSettings, routeClosings, aiMetrics }),
        [clients, loans, expenses, requests, notes, receipts, employees, collectors, systemSettings, routeClosings, aiMetrics]
    );

    // --- Remote synced: Clients ---

    const loadClients = async (token) => {
        if (!token) return;
        try {
            const res = await fetch(`${API_BASE_URL}/api/clients`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) return;
            const data = await res.json();
            setClients(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Error loading clients from API', err);
        }
    };

    // --- Remote: AI Metrics ---

    const loadAiMetrics = async (token) => {
        if (!token) return;
        try {
            const res = await fetch(`${API_BASE_URL}/api/ai/metrics`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) return;
            const data = await res.json();
            setAiMetrics(data || null);
        } catch (err) {
            console.error('Error loading AI metrics from API', err);
        }
    };

    const addClient = (data, token) => {
        if (!token) {
            // fallback local-only
            setClients([...clients, { ...data, id: generateId(), score: 70, createdAt: new Date().toISOString() }]);
            return;
        }
        fetch(`${API_BASE_URL}/api/clients`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(data),
        })
            .then((res) => (res.ok ? res.json() : null))
            .then((created) => {
                if (created) {
                    setClients((prev) => [created, ...prev]);
                }
            })
            .catch((err) => console.error('Error creating client via API', err));
    };

    const updateClient = (updatedClient, token) => {
        if (!updatedClient || !updatedClient.id) return;
        setClients(clients.map(c => (c.id === updatedClient.id ? { ...c, ...updatedClient } : c)));

        if (!token) return;
        fetch(`${API_BASE_URL}/api/clients/${updatedClient.id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(updatedClient),
        }).catch((err) => console.error('Error updating client via API', err));
    };

    const addEmployee = (data) => {
        setEmployees([...employees, { ...data, id: generateId() }]);
    };

    // --- Remote synced: Collectors ---

    const loadCollectors = async (token) => {
        if (!token) return;
        try {
            const res = await fetch(`${API_BASE_URL}/api/collectors`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) return;
            const data = await res.json();
            setCollectors(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Error loading collectors from API', err);
        }
    };

    // --- Remote synced: Loans ---

    const loadLoans = async (token) => {
        if (!token) return;
        try {
            const res = await fetch(`${API_BASE_URL}/api/loans`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) return;
            const data = await res.json();
            setLoans(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Error loading loans from API', err);
        }
    };

    const addCollector = (data, token) => {
        if (!token) {
            const id = data.id || generateId();
            setCollectors([...collectors, { ...data, id }]);
            return;
        }
        fetch(`${API_BASE_URL}/api/collectors`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(data),
        })
            .then((res) => (res.ok ? res.json() : null))
            .then((created) => {
                if (created) {
                    setCollectors((prev) => [created, ...prev]);
                }
            })
            .catch((err) => console.error('Error creating collector via API', err));
    };

    const updateCollector = (updatedCollector, token) => {
        if (!updatedCollector || !updatedCollector.id) return;
        setCollectors(collectors.map(c => (c.id === updatedCollector.id ? { ...c, ...updatedCollector } : c)));

        if (!token) return;
        fetch(`${API_BASE_URL}/api/collectors/${updatedCollector.id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(updatedCollector),
        }).catch((err) => console.error('Error updating collector via API', err));
    };

    const removeCollector = (collectorId, token) => {
        if (!collectorId) return;
        setCollectors(collectors.filter(c => c.id !== collectorId));

        if (!token) return;
        fetch(`${API_BASE_URL}/api/collectors/${collectorId}`, {
            method: 'DELETE',
            headers: {
                Authorization: `Bearer ${token}`,
            },
        }).catch((err) => console.error('Error deleting collector via API', err));
    };

    const addExpense = (data) => {
        setExpenses([...expenses, { ...data, id: generateId(), date: new Date().toISOString() }]);
    };

    const addRequest = (data) => {
        setRequests([...requests, { ...data, id: generateId(), status: 'REVIEW', date: new Date().toISOString() }]);
    };

    const createLoan = (loanData, token) => {
        if (!token) {
            const newLoan = createLoanLogic({ ...loanData, id: generateId() });
            setLoans([newLoan, ...loans]);
            return newLoan;
        }

        fetch(`${API_BASE_URL}/api/loans`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(loanData),
        })
            .then((res) => (res.ok ? res.json() : null))
            .then((created) => {
                if (created) {
                    setLoans((prev) => [created, ...prev]);
                }
            })
            .catch((err) => console.error('Error creating loan via API', err));
    };

    const updateLoan = (updatedLoan, token) => {
        if (!updatedLoan || !updatedLoan.id) return;
        setLoans(loans.map(l => (l.id === updatedLoan.id ? { ...l, ...updatedLoan } : l)));

        if (!token) return;
        const payload = {
            amount: updatedLoan.amount,
            rate: updatedLoan.rate,
            term: updatedLoan.term,
            frequency: updatedLoan.frequency,
            startDate: updatedLoan.startDate,
        };

        fetch(`${API_BASE_URL}/api/loans/${updatedLoan.id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(payload),
        })
            .then((res) => (res.ok ? res.json() : null))
            .then((serverLoan) => {
                if (serverLoan) {
                    setLoans((prev) => prev.map((l) => (l.id === serverLoan.id ? serverLoan : l)));
                }
            })
            .catch((err) => console.error('Error updating loan via API', err));
    };

    const approveRequest = (req, token) => {
        createLoan(req, token);
        setRequests(requests.map(r => r.id === req.id ? { ...r, status: 'APPROVED' } : r));
    };

    const rejectRequest = (req) => {
        setRequests(requests.map(r => r.id === req.id ? { ...r, status: 'REJECTED' } : r));
    };

    const registerPayment = (loanId, installmentId, options = {}, token) => {
        const loan = loans.find(l => l.id === loanId);
        if (!loan) return null;

        const result = registerPaymentLogic(loan, installmentId, options, systemSettings);
        if (!result) return null;

        const { updatedLoan, receiptData } = result;
        const client = clients.find(c => c.id === loan.clientId);

        const newReceipt = {
            id: generateId(),
            date: new Date().toISOString(),
            loanId: loan.id,
            clientId: client?.id,
            clientName: client?.name,
            clientPhone: client?.phone || '',
            clientAddress: client?.address || '',
            ...receiptData
        };

        setReceipts([newReceipt, ...receipts]);
        setLoans(loans.map(l => l.id === loanId ? updatedLoan : l));

        if (token) {
            const { withPenalty = false, penaltyAmount = 0 } = {
                withPenalty: result.receiptData?.withPenalty,
                penaltyAmount: result.receiptData?.penaltyAmount || 0,
            };

            fetch(`${API_BASE_URL}/api/loans/${loanId}/payments`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    installmentId,
                    withPenalty: !!withPenalty,
                    penaltyAmount,
                }),
            }).catch((err) => console.error('Error registering payment via API', err));
        }

        return newReceipt;
    };

    const assignCollectorToClient = (clientId, collectorId, token) => {
        setClients(clients.map(c => (c.id === clientId ? { ...c, collectorId } : c)));

        if (!token) return;
        fetch(`${API_BASE_URL}/api/clients/${clientId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ collectorId }),
        }).catch((err) => console.error('Error assigning collector via API', err));
    };

    const addRouteClosing = ({ collectorId, date, totalAmount, receiptsCount }) => {
        const closing = {
            id: generateId(),
            collectorId,
            date,
            totalAmount,
            receiptsCount,
        };
        setRouteClosings([closing, ...routeClosings]);
    };

    // Carga inicial de datos remotos (si hay sesión SaaS)
    useEffect(() => {
        try {
            const raw = localStorage.getItem('presta_pro_auth_v2');
            if (!raw) return;
            const saved = JSON.parse(raw);
            const token = saved?.user?.token;
            if (!token) return;
            loadClients(token);
            loadCollectors(token);
            loadLoans(token);
            loadAiMetrics(token);
        } catch (e) {
            console.error('Error restoring auth for data sync', e);
        }
    }, []);

    const resetDataForNewTenant = () => {
        setClients([]);
        setLoans([]);
        setExpenses([]);
        setRequests([]);
        setNotes([]);
        setReceipts([]);
        setEmployees([]);
        setRouteClosings([]);
        setCollectors([]);
    };

    return {
        clients, loans, expenses, requests, notes, receipts, employees, collectors, routeClosings, systemSettings, dbData,
        setClients, setLoans, setExpenses, setRequests, setNotes, setReceipts, setEmployees, setCollectors, setRouteClosings, setSystemSettings,
        addClient, updateClient,
        addEmployee,
        addCollector, updateCollector, removeCollector,
        addExpense,
        addRequest,
        approveRequest,
        rejectRequest,
        createLoan,
        updateLoan,
        registerPayment,
        assignCollectorToClient,
        addRouteClosing,
        loadClients,
        loadCollectors,
        loadLoans,
        loadAiMetrics,
        resetDataForNewTenant
    };
}
