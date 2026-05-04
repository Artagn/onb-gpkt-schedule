import React from 'react';
import { Role } from '../../types';
import { Plus, FileSpreadsheet } from 'lucide-react';
import { useEmployeeManager } from './useEmployeeManager';
import EmployeeTable from './EmployeeTable';
import EmployeeModals from './EmployeeModals';

interface Props {
    currentUserRole: Role;
}

/**
 * Employee Manager - Refactored v3.9.10
 * Main orchestrator component for employee CRUD operations
 */
const EmployeeManager: React.FC<Props> = ({ currentUserRole }) => {
    const {
        filteredEmployees,
        isEditing,
        setIsEditing,
        editForm,
        setEditForm,
        filters,
        setFilters,
        deleteId,
        setDeleteId,
        showImport,
        setShowImport,
        handleEdit,
        handleDeleteClick,
        confirmDelete,
        handleSave,
        handleFileUpload,
        downloadTemplate,
        openAddNew,
    } = useEmployeeManager();

    return (
        <div className="p-6 bg-white rounded-lg shadow h-full flex flex-col">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-slate-800">Quản lý Nhân viên</h2>
                <div className="flex gap-2">
                    <button
                        onClick={() => setShowImport(true)}
                        className="flex items-center px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 shadow-sm"
                    >
                        <FileSpreadsheet className="w-4 h-4 mr-2" /> Nhập Excel
                    </button>
                    <button
                        onClick={openAddNew}
                        className="flex items-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 shadow-sm"
                    >
                        <Plus className="w-4 h-4 mr-2" /> Thêm nhân viên
                    </button>
                </div>
            </div>

            {/* Table with Filters */}
            <EmployeeTable
                employees={filteredEmployees}
                filters={filters}
                setFilters={setFilters}
                onEdit={handleEdit}
                onDelete={handleDeleteClick}
            />

            {/* All Modals */}
            <EmployeeModals
                currentUserRole={currentUserRole}
                isEditing={isEditing}
                editForm={editForm}
                setEditForm={setEditForm}
                onSave={handleSave}
                onCancelEdit={() => setIsEditing(null)}
                deleteId={deleteId}
                onConfirmDelete={confirmDelete}
                onCancelDelete={() => setDeleteId(null)}
                showImport={showImport}
                onFileUpload={handleFileUpload}
                onDownloadTemplate={downloadTemplate}
                onCloseImport={() => setShowImport(false)}
            />
        </div>
    );
};

export default EmployeeManager;
