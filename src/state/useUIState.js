import { useState } from 'react';

export function useUIState() {
    const [activeTab, setActiveTab] = useState('dashboard');
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [showNotification, setShowNotification] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [printReceipt, setPrintReceipt] = useState(null);
    const [clientModalOpen, setClientModalOpen] = useState(false);
    const [employeeModalOpen, setEmployeeModalOpen] = useState(false);
    const [securityToken, setSecurityToken] = useState('');
    const [chatHistory, setChatHistory] = useState([]);

    // Navigation selections
    const [selectedClientId, setSelectedClientId] = useState(null);
    const [selectedLoanId, setSelectedLoanId] = useState(null);

    // Route UI state
    const [currentRouteLoanIds, setCurrentRouteLoanIds] = useState([]);
    const [routeActive, setRouteActive] = useState(false);

    const showToast = (msg, type = 'success') => {
        setShowNotification({ msg, type });
        setTimeout(() => setShowNotification(null), 3000);
    };

    const handlePrint = () => {
        window.print();
        setTimeout(() => setPrintReceipt(null), 1000);
    };

    const toggleLoanInRoute = (loanId, installmentId) => {
        const key = `${loanId}:${installmentId}`;
        setCurrentRouteLoanIds(prev =>
            prev.includes(key) ? prev.filter(id => id !== key) : [...prev, key]
        );
    };

    const clearCurrentRoute = () => {
        setCurrentRouteLoanIds([]);
        setRouteActive(false);
    };

    return {
        activeTab, setActiveTab,
        mobileMenuOpen, setMobileMenuOpen,
        showNotification, setShowNotification,
        searchQuery, setSearchQuery,
        printReceipt, setPrintReceipt,
        clientModalOpen, setClientModalOpen,
        employeeModalOpen, setEmployeeModalOpen,
        securityToken, setSecurityToken,
        chatHistory, setChatHistory,
        selectedClientId, setSelectedClientId,
        selectedLoanId, setSelectedLoanId,
        currentRouteLoanIds, setCurrentRouteLoanIds,
        routeActive, setRouteActive,
        showToast, handlePrint,
        toggleLoanInRoute, clearCurrentRoute
    };
}
