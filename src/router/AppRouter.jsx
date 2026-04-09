import React, { Suspense } from 'react';
import Skeleton from '../shared/components/ui/Skeleton';
import { useAppData } from '../context/AppDataContext';

// Views (Lazy Loaded)
const DashboardView = React.lazy(() => import('../modules/dashboard').then(m => ({ default: m.DashboardView })));
const CuadreView = React.lazy(() => import('../modules/accounting').then(m => ({ default: m.CuadreView })));
const ClientsView = React.lazy(() => import('../modules/clients').then(m => ({ default: m.ClientsView })));
const LoansView = React.lazy(() => import('../modules/loans').then(m => ({ default: m.LoansView })));
const ExpensesView = React.lazy(() => import('../modules/expenses').then(m => ({ default: m.ExpensesView })));
const RequestsView = React.lazy(() => import('../modules/requests').then(m => ({ default: m.RequestsView })));
const RoutesView = React.lazy(() => import('../modules/routes').then(m => ({ default: m.RoutesView })));
const NotesView = React.lazy(() => import('../modules/notes').then(m => ({ default: m.NotesView })));
const ReportsView = React.lazy(() => import('../modules/reports').then(m => ({ default: m.ReportsView })));
const SettingsView = React.lazy(() => import('../modules/settings').then(m => ({ default: m.SettingsView })));
const DocumentsView = React.lazy(() => import('../modules/documents').then(m => ({ default: m.DocumentsView })));
const HRView = React.lazy(() => import('../modules/employees').then(m => ({ default: m.HRView })));
const AccountingView = React.lazy(() => import('../modules/accounting').then(m => ({ default: m.AccountingView })));
const AIView = React.lazy(() => import('../modules/ai').then(m => ({ default: m.AIView })));
const CalculatorView = React.lazy(() => import('../modules/tools').then(m => ({ default: m.CalculatorView })));
const NotificationsView = React.lazy(() => import('../modules/notifications').then(m => ({ default: m.NotificationsView })));
const CollectorsModule = React.lazy(() => import('../modules/collectors').then(m => ({ default: m.CollectorsView })));
const AdminDashboard = React.lazy(() => import('../modules/admin').then(m => ({ default: m.AdminDashboard })));
const SubscriptionDashboard = React.lazy(() => import('../modules/subscriptions').then(m => ({ default: m.SubscriptionDashboard })));

export default function AppRouter({ activeTab, setActiveTab, navParams, modalActions }) {
  const {
    dbData, showToast, user,
    registerPayment, addExpense, deleteExpense,
    approveRequest, rejectRequest,
    addCollector, updateCollector, removeCollector, assignCollectorToClient,
    createLoan, updateLoan, updateClient, handleAddClientDocument,
    toggleLoanInRoute, clearCurrentRoute, startRoute, finishRoute, addRouteClosing,
    setSystemSettings,
  } = useAppData();

  const { selectedClientId, setSelectedClientId, selectedLoanId, setSelectedLoanId } = navParams;
  const { openClientModal, openEmployeeModal, openDeleteConfirm, setClientCreatedCallback } = modalActions;

  function renderContent() {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardView
          dbData={dbData} showToast={showToast} user={user}
          stats={dbData} loans={dbData.loans} clients={dbData.clients}
          receipts={dbData.receipts} expenses={dbData.expenses}
          onNavigate={(tab) => setActiveTab(tab)}
        />;
      case 'cuadre':
        return <CuadreView
          loans={dbData.loans} receipts={dbData.receipts} expenses={dbData.expenses}
          collectors={dbData.collectors} showToast={showToast}
        />;
      case 'clients':
        return <ClientsView
          clients={dbData.clients} loans={dbData.loans} receipts={dbData.receipts}
          collectors={dbData.collectors} selectedClientId={selectedClientId}
          onNewClient={() => openClientModal()}
          onSelectClient={(id) => setSelectedClientId(id)}
          onSelectLoan={() => setActiveTab('loans')}
          onEditClient={(client) => openClientModal(client)}
          onUpdateClient={updateClient}
          onNavigateToDocuments={(clientId) => { setSelectedClientId(clientId); setActiveTab('documents'); }}
          addClientDocument={handleAddClientDocument}
          onDeleteClient={(client) => openDeleteConfirm('client', client)}
        />;
      case 'loans':
        return <LoansView
          loans={dbData.loans} clients={dbData.clients} collectors={dbData.collectors}
          registerPayment={registerPayment}
          selectedLoanId={selectedLoanId}
          onSelectLoan={(id) => setSelectedLoanId(id === selectedLoanId ? null : id)}
          onUpdateLoan={updateLoan}
          onCreateLoan={createLoan}
          addClientDocument={handleAddClientDocument}
          onNavigateToDocuments={(clientId) => { setSelectedClientId(clientId); setActiveTab('documents'); }}
          onNewClient={() => openClientModal()}
        />;
      case 'requests':
        return <RequestsView
          clients={dbData.clients} showToast={showToast}
          onNewClient={(callback) => { setClientCreatedCallback(() => callback); openClientModal(); }}
          onCreateLoan={createLoan}
        />;
      case 'routes':
        return <RoutesView
          loans={dbData.loans} clients={dbData.clients} registerPayment={registerPayment}
          collectors={dbData.collectors} receipts={dbData.receipts}
          currentRouteLoanIds={dbData.routes || []} routeActive={dbData.routeActive || false}
          toggleLoanInRoute={toggleLoanInRoute} clearCurrentRoute={clearCurrentRoute}
          startRoute={startRoute} finishRoute={finishRoute}
          showToast={showToast} addRouteClosing={addRouteClosing}
          routeClosings={dbData.routeClosings || []}
          includeFutureInstallments={dbData.systemSettings?.includeFutureInstallmentsInRoutes ?? true}
          systemSettings={dbData.systemSettings}
        />;
      case 'notes':
        return <NotesView showToast={showToast} />;
      case 'expenses':
        return <ExpensesView
          expenses={dbData.expenses} addExpense={addExpense} onDeleteExpense={deleteExpense}
        />;
      case 'reports':
        return <ReportsView
          loans={dbData.loans} expenses={dbData.expenses}
          receipts={dbData.receipts} clients={dbData.clients}
          collectors={dbData.collectors} routeClosings={dbData.routeClosings || []}
          systemSettings={dbData.systemSettings} showToast={showToast}
        />;
      case 'hr':
        return <HRView
          employees={dbData.employees}
          onNewEmployee={() => openEmployeeModal()}
          onEditEmployee={(emp) => openEmployeeModal(emp)}
          onDeleteEmployee={(emp) => openDeleteConfirm('employee', emp)}
        />;
      case 'accounting':
        return <AccountingView
          loans={dbData.loans} expenses={dbData.expenses} receipts={dbData.receipts}
          systemSettings={dbData.systemSettings} routeClosings={dbData.routeClosings || []}
        />;
      case 'documents':
        return <DocumentsView
          clients={dbData.clients} loans={dbData.loans}
          companyName={dbData.systemSettings?.companyName}
          selectedClientId={selectedClientId} onSelectClient={setSelectedClientId}
          clientDocuments={dbData.clientDocuments || {}} addClientDocument={handleAddClientDocument}
        />;
      case 'calc':
        return <CalculatorView />;
      case 'ai':
        return <AIView
          chatHistory={[]} setChatHistory={() => {}} dbData={dbData} showToast={showToast}
          ownerName={user?.name} companyName={dbData.systemSettings?.companyName}
        />;
      case 'settings':
        return <SettingsView
          systemSettings={dbData.systemSettings} setSystemSettings={setSystemSettings}
          collectors={dbData.collectors} addCollector={addCollector}
          updateCollector={updateCollector} removeCollector={removeCollector}
          clients={dbData.clients} assignCollectorToClient={assignCollectorToClient}
          auth={{ user }} showToast={showToast} setActiveTab={setActiveTab}
        />;
      case 'pricing':
        return <SubscriptionDashboard showToast={showToast} />;
      case 'notifications':
        return <NotificationsView showToast={showToast} />;
      case 'collectors-manage':
        return <CollectorsModule showToast={showToast} clients={dbData.clients} />;
      case 'admin-panel':
        return <AdminDashboard showToast={showToast} />;
      default:
        return <DashboardView dbData={dbData} showToast={showToast} user={user} />;
    }
  }

  return (
    <Suspense fallback={<Skeleton.Dashboard />}>
      {renderContent()}
    </Suspense>
  );
}
