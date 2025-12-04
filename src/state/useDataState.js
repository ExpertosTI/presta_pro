import { useState, useEffect, useMemo } from 'react';
import { safeLoad } from '../utils/storage';
import { generateId } from '../utils/ids';
import { createLoanLogic, registerPaymentLogic } from '../logic/loanLogic';

export function useDataState() {
    const [clients, setClients] = useState(() => safeLoad('rt_clients', []));
    const [loans, setLoans] = useState(() => safeLoad('rt_loans', []));
    const [expenses, setExpenses] = useState(() => safeLoad('rt_expenses', []));
    const [requests, setRequests] = useState(() => safeLoad('rt_requests', []));
    const [notes, setNotes] = useState(() => safeLoad('rt_notes', []));
    const [receipts, setReceipts] = useState(() => safeLoad('rt_receipts', []));
    const [employees, setEmployees] = useState(() => safeLoad('rt_employees', []));
    const [routeClosings, setRouteClosings] = useState(() => safeLoad('rt_route_closings', []));
    const [collectors, setCollectors] = useState(() => safeLoad('rt_collectors', []));

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
    useEffect(() => localStorage.setItem('rt_clients', JSON.stringify(clients)), [clients]);
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
        () => ({ clients, loans, expenses, requests, notes, receipts, employees, collectors, systemSettings, routeClosings }),
        [clients, loans, expenses, requests, notes, receipts, employees, collectors, systemSettings, routeClosings]
    );

    const addClient = (data) => {
        setClients([...clients, { ...data, id: generateId(), score: 70, createdAt: new Date().toISOString() }]);
    };

    const updateClient = (updatedClient) => {
        if (!updatedClient || !updatedClient.id) return;
        setClients(clients.map(c => (c.id === updatedClient.id ? { ...c, ...updatedClient } : c)));
    };

    const addEmployee = (data) => {
        setEmployees([...employees, { ...data, id: generateId() }]);
    };

    const addCollector = (data) => {
        const id = data.id || generateId();
        setCollectors([...collectors, { ...data, id }]);
    };

    const addExpense = (data) => {
        setExpenses([...expenses, { ...data, id: generateId(), date: new Date().toISOString() }]);
    };

    const addRequest = (data) => {
        setRequests([...requests, { ...data, id: generateId(), status: 'REVIEW', date: new Date().toISOString() }]);
    };

    const createLoan = (loanData) => {
        const newLoan = createLoanLogic({ ...loanData, id: generateId() });
        setLoans([newLoan, ...loans]);
        return newLoan;
    };

    const updateLoan = (updatedLoan) => {
        if (!updatedLoan || !updatedLoan.id) return;
        setLoans(loans.map(l => (l.id === updatedLoan.id ? { ...l, ...updatedLoan } : l)));
    };

    const approveRequest = (req) => {
        createLoan(req);
        setRequests(requests.map(r => r.id === req.id ? { ...r, status: 'APPROVED' } : r));
    };

    const rejectRequest = (req) => {
        setRequests(requests.map(r => r.id === req.id ? { ...r, status: 'REJECTED' } : r));
    };

    const registerPayment = (loanId, installmentId, options = {}) => {
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

        return newReceipt;
    };

    const assignCollectorToClient = (clientId, collectorId) => {
        setClients(clients.map(c => (c.id === clientId ? { ...c, collectorId } : c)));
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

    return {
        clients, loans, expenses, requests, notes, receipts, employees, collectors, routeClosings, systemSettings, dbData,
        setClients, setLoans, setExpenses, setRequests, setNotes, setReceipts, setEmployees, setCollectors, setRouteClosings, setSystemSettings,
        addClient, updateClient,
        addEmployee,
        addCollector,
        addExpense,
        addRequest,
        approveRequest,
        rejectRequest,
        createLoan,
        updateLoan,
        registerPayment,
        assignCollectorToClient,
        addRouteClosing
    };
}
