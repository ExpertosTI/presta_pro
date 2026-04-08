import React from 'react';
import { ClientModal } from '../../../modules/clients';
import { EmployeeModal } from '../../../modules/employees';
import { useAppData } from '../../../context/AppDataContext';

export default function ModalManager({
  clientModalOpen, setClientModalOpen,
  editingClient, setEditingClient,
  clientCreatedCallback, setClientCreatedCallback,
  employeeModalOpen, setEmployeeModalOpen,
  editingEmployee, setEditingEmployee,
  deleteConfirmModal, setDeleteConfirmModal,
  selectedClientId, setSelectedClientId,
}) {
  const { saveClient, saveEmployee, deleteClient, deleteEmployee } = useAppData();

  return (
    <>
      {/* Client Modal */}
      <ClientModal
        open={clientModalOpen}
        onClose={() => {
          setClientModalOpen(false);
          setEditingClient(null);
          setClientCreatedCallback(null);
        }}
        onSave={async (clientData) => {
          await saveClient(clientData, editingClient, clientCreatedCallback);
          setClientModalOpen(false);
          setEditingClient(null);
          setClientCreatedCallback(null);
        }}
        initialClient={editingClient}
      />

      {/* Employee Modal */}
      <EmployeeModal
        open={employeeModalOpen}
        onClose={() => {
          setEmployeeModalOpen(false);
          setEditingEmployee(null);
        }}
        onSave={async (employeeData) => {
          await saveEmployee(employeeData, editingEmployee);
          setEmployeeModalOpen(false);
          setEditingEmployee(null);
        }}
        initialEmployee={editingEmployee}
      />

      {/* Delete Confirmation Modal */}
      {deleteConfirmModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 w-full max-w-sm animate-fade-in">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-3">
              Confirmar Eliminación
            </h3>
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              ¿Eliminar a <strong>{deleteConfirmModal.item?.name}</strong>? Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirmModal(null)}
                className="flex-1 py-2.5 rounded-lg font-semibold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600"
              >
                Cancelar
              </button>
              <button
                onClick={async () => {
                  const { type, item } = deleteConfirmModal;
                  if (type === 'client') {
                    await deleteClient(item);
                    setSelectedClientId(null);
                  } else if (type === 'employee') {
                    await deleteEmployee(item);
                  }
                  setDeleteConfirmModal(null);
                }}
                className="flex-1 py-2.5 rounded-lg font-semibold bg-rose-600 text-white hover:bg-rose-500"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
