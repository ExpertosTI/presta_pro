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

    const [theme, setTheme] = useState(() => {
        try {
            return localStorage.getItem('theme') || 'light';
        } catch {
            return 'light';
        }
    });

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

    const toggleTheme = () => {
        const newTheme = theme === 'light' ? 'dark' : 'light';
        setTheme(newTheme);
        localStorage.setItem('theme', newTheme);
        if (newTheme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    };

    // Initialize theme on mount (side effect here or in App, but here is fine for state init)
    // We need useEffect for this to be robust, but we can also just rely on the toggle for now
    // or let the consumer handle the class application. 
    // Better: expose theme and toggleTheme, and let App apply the class or do it here with useEffect.

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
        toggleLoanInRoute, clearCurrentRoute,
        theme, toggleTheme
    };
}
