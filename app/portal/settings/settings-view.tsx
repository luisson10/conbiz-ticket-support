"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import AccountsColumn from "@/app/portal/settings/_components/accounts-column";
import AccountDetailsPanel from "@/app/portal/settings/_components/account-details-panel";
import CreateOrganizationModal from "@/app/portal/settings/_components/create-organization-modal";
import { emptyBoardForm, useSettingsController } from "@/app/portal/settings/use-settings-controller";

export default function SettingsView() {
  const {
    loading,
    search,
    setSearch,
    selectedAccountId,
    setSelectedAccountId,
    selectedAccount,
    filteredAccounts,
    accountName,
    setAccountName,
    savingAccount,
    showCreateAccount,
    setShowCreateAccount,
    newAccountName,
    setNewAccountName,
    savingNewAccount,
    supportBoard,
    projectBoard,
    boardForms,
    createForms,
    teams,
    projectsByTeam,
    savingBoardId,
    creatingBoardType,
    errorMessage,
    setErrorMessage,
    successMessage,
    setSuccessMessage,
    loadProjectsForTeam,
    handleCreateAccount,
    handleSaveAccount,
    handleCreateBoard,
    handleSaveBoard,
    setBoardForms,
    setCreateForms,
  } = useSettingsController();

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-10 text-sm text-gray-500">
        Cargando configuracion...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-gray-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <Link
              href="/portal"
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver al portal
            </Link>
            <div>
              <div className="text-lg font-semibold text-gray-900">Configuracion de cuentas</div>
              <div className="text-xs text-gray-500">Gestiona organizaciones y boards de soporte/proyecto</div>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-6 py-6 lg:grid-cols-[22rem_minmax(0,1fr)]">
        <AccountsColumn
          search={search}
          onSearchChange={setSearch}
          accounts={filteredAccounts}
          selectedAccountId={selectedAccountId}
          onSelectAccount={setSelectedAccountId}
          onCreateAccount={() => {
            setErrorMessage(null);
            setSuccessMessage(null);
            setShowCreateAccount(true);
          }}
        />

        <AccountDetailsPanel
          account={selectedAccount}
          accountName={accountName}
          onChangeAccountName={setAccountName}
          onSaveAccount={handleSaveAccount}
          savingAccount={savingAccount}
          supportBoard={supportBoard}
          projectBoard={projectBoard}
          supportForm={supportBoard ? boardForms[supportBoard.id] || emptyBoardForm : createForms.SUPPORT}
          projectForm={projectBoard ? boardForms[projectBoard.id] || emptyBoardForm : createForms.PROJECT}
          teams={teams}
          supportProjects={projectsByTeam[(supportBoard ? boardForms[supportBoard.id] : createForms.SUPPORT)?.teamId || ""] || []}
          projectProjects={projectsByTeam[(projectBoard ? boardForms[projectBoard.id] : createForms.PROJECT)?.teamId || ""] || []}
          savingBoardId={savingBoardId}
          creatingBoardType={creatingBoardType}
          onChangeBoardForm={(type, value) => {
            if (type === "SUPPORT" && supportBoard) {
              setBoardForms((prev) => ({ ...prev, [supportBoard.id]: value }));
              return;
            }
            if (type === "PROJECT" && projectBoard) {
              setBoardForms((prev) => ({ ...prev, [projectBoard.id]: value }));
              return;
            }
            setCreateForms((prev) => ({ ...prev, [type]: value }));
          }}
          onSelectTeam={loadProjectsForTeam}
          onSaveBoard={handleSaveBoard}
          onCreateBoard={handleCreateBoard}
          errorMessage={errorMessage}
          successMessage={successMessage}
        />
      </main>

      <CreateOrganizationModal
        open={showCreateAccount}
        name={newAccountName}
        onChangeName={setNewAccountName}
        errorMessage={errorMessage}
        saving={savingNewAccount}
        onClose={() => {
          setShowCreateAccount(false);
          setNewAccountName("");
          setErrorMessage(null);
        }}
        onCreate={handleCreateAccount}
      />
    </div>
  );
}
