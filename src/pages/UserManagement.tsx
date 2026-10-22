import { useCallback, useEffect, useState, type FormEvent } from "react";
import { isAxiosError } from "axios";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import PageMeta from "../components/common/PageMeta";
import Button from "../components/ui/button/Button";
import Badge from "../components/ui/badge/Badge";
import Alert from "../components/ui/alert/Alert";
import { Modal } from "../components/ui/modal";
import { useModal } from "../hooks/useModal";
import Label from "../components/form/Label";
import Input from "../components/form/input/InputField";
import Checkbox from "../components/form/input/Checkbox";
import Pagination from "../components/common/Pagination";
import ConfirmDeleteModal from "../components/common/ConfirmDeleteModal";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";
import type { AuthUser, UserRole } from "../types/auth";

interface UserFormState {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  is_active: boolean;
}

const emptyForm: UserFormState = {
  name: "",
  email: "",
  password: "",
  role: "operator",
  is_active: true,
};

const ITEMS_PER_PAGE = 10;

export default function UserManagement() {
  const { user: currentUser } = useAuth();
  const { isOpen, openModal, closeModal } = useModal();
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [formError, setFormError] = useState("");
  const [alert, setAlert] = useState<{ variant: "success" | "error"; title: string; message: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editingUser, setEditingUser] = useState<AuthUser | null>(null);
  const [deletingUser, setDeletingUser] = useState<AuthUser | null>(null);
  const [form, setForm] = useState<UserFormState>(emptyForm);
  const [currentPage, setCurrentPage] = useState(1);

  // Auto-close success alerts after 4 seconds
  useEffect(() => {
    if (alert?.variant === "success") {
      const timer = setTimeout(() => {
        setAlert(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [alert]);

  const loadUsers = useCallback(async () => {
    try {
      const response = await api.get<{ users: AuthUser[] }>("/users");
      setUsers(response.data.users);
    } catch {
      setAlert({ variant: "error", title: "Error", message: "Failed to load users." });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const openCreate = () => {
    setEditingUser(null);
    setForm(emptyForm);
    setFormError("");
    openModal();
  };

  const openEdit = (user: AuthUser) => {
    setEditingUser(user);
    setForm({
      name: user.name,
      email: user.email,
      password: "",
      role: user.role,
      is_active: user.is_active,
    });
    setFormError("");
    openModal();
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError("");
    setIsSaving(true);

    try {
      if (editingUser) {
        const payload: Record<string, unknown> = {
          name: form.name,
          email: form.email,
          role: form.role,
          is_active: form.is_active,
        };
        if (form.password.trim()) {
          payload.password = form.password;
        }
        await api.put(`/users/${editingUser.id}`, payload);
        setAlert({
          variant: "success",
          title: "Success",
          message: `User "${form.name}" updated successfully.`,
        });
      } else {
        await api.post("/users", form);
        setAlert({
          variant: "success",
          title: "Success",
          message: `User "${form.name}" created successfully.`,
        });
      }
      closeModal();
      await loadUsers();
    } catch (err) {
      if (isAxiosError(err)) {
        const errors = err.response?.data?.errors as
          | Record<string, string[]>
          | undefined;
        const firstError = errors ? Object.values(errors)[0]?.[0] : undefined;
        setFormError(
          firstError || err.response?.data?.message || "Failed to save user."
        );
      } else {
        setFormError("Failed to save user.");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteClick = (user: AuthUser) => {
    if (user.id === currentUser?.id) {
      return;
    }
    setDeletingUser(user);
  };

  const handleConfirmDelete = async () => {
    if (!deletingUser) return;
    setIsDeleting(true);
    try {
      await api.delete(`/users/${deletingUser.id}`);
      setAlert({
        variant: "success",
        title: "Success",
        message: `User "${deletingUser.name || deletingUser.email}" deleted successfully.`,
      });
      setDeletingUser(null);
      await loadUsers();
    } catch (err) {
      const msg = isAxiosError(err) ? err.response?.data?.message || "Failed to delete user." : "Failed to delete user.";
      setAlert({
        variant: "error",
        title: "Delete Failed",
        message: msg,
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const totalPages = Math.ceil(users.length / ITEMS_PER_PAGE);
  const displayedUsers = users.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  return (
    <>
      <PageMeta
        title="User Management | Energy Monitoring"
        description="Create and manage Energy Monitoring users"
      />
      <PageBreadcrumb pageTitle="User Management" />

      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Button size="sm" onClick={openCreate}>
            Add User
          </Button>
        </div>

        {alert && (
          <Alert
            variant={alert.variant}
            title={alert.title}
            message={alert.message}
            onClose={alert.variant === "error" ? () => setAlert(null) : undefined}
          />
        )}

        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
          <div className="max-w-full overflow-x-auto">
            <Table>
              <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                <TableRow>
                  <TableCell
                    isHeader
                    className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                  >
                    User
                  </TableCell>
                  <TableCell
                    isHeader
                    className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                  >
                    Role
                  </TableCell>
                  <TableCell
                    isHeader
                    className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                  >
                    Status
                  </TableCell>
                  <TableCell
                    isHeader
                    className="px-5 py-3 font-medium text-gray-500 text-end text-theme-xs dark:text-gray-400"
                  >
                    Actions
                  </TableCell>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="px-5 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                      Loading users...
                    </TableCell>
                  </TableRow>
                ) : users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="px-5 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                      No users found. Click &quot;Add User&quot; to create one.
                    </TableCell>
                  </TableRow>
                ) : (
                  displayedUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="px-5 py-4 sm:px-6 text-start">
                        <span className="block font-medium text-gray-800 text-theme-sm dark:text-white/90">
                          {user.name}
                        </span>
                        <span className="block text-gray-500 text-theme-xs dark:text-gray-400">
                          {user.email}
                        </span>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-start">
                        <Badge
                          size="sm"
                          color={user.role === "admin" ? "primary" : "info"}
                        >
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-start">
                        <Badge
                          size="sm"
                          color={user.is_active ? "success" : "error"}
                        >
                          {user.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openEdit(user)}
                          >
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={user.id === currentUser?.id}
                            onClick={() => handleDeleteClick(user)}
                          >
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={users.length}
            itemsPerPage={ITEMS_PER_PAGE}
            onPageChange={(page) => setCurrentPage(page)}
          />
        </div>
      </div>

      {/* Add / Edit User Modal */}
      <Modal
        isOpen={isOpen}
        onClose={closeModal}
        className="max-w-[584px] p-5 lg:p-10"
      >
        <form onSubmit={handleSubmit}>
          <h4 className="mb-6 text-lg font-medium text-gray-800 dark:text-white/90">
            {editingUser ? "Edit User" : "Add User"}
          </h4>

          {formError && (
            <div className="mb-5">
              <Alert
                variant="error"
                title="Save Failed"
                message={formError}
                onClose={() => setFormError("")}
              />
            </div>
          )}

          <div className="space-y-5">
            <div>
              <Label>Name</Label>
              <Input
                type="text"
                placeholder="e.g. John Doe"
                value={form.name}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, name: event.target.value }))
                }
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                placeholder="e.g. user@example.com"
                value={form.email}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, email: event.target.value }))
                }
              />
            </div>
            <div>
              <Label>
                Password
                {editingUser ? " (leave blank to keep current)" : ""}
              </Label>
              <Input
                type="password"
                placeholder={editingUser ? "••••••••" : "Enter password"}
                value={form.password}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, password: event.target.value }))
                }
              />
            </div>
            <div>
              <Label>Role</Label>
              <select
                className="h-11 w-full appearance-none rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 pr-11 text-sm shadow-theme-xs text-gray-800 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                value={form.role}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    role: event.target.value as UserRole,
                  }))
                }
              >
                <option value="operator">Operator</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <Checkbox
              checked={form.is_active}
              onChange={(checked) =>
                setForm((prev) => ({ ...prev, is_active: checked }))
              }
              label="Active"
            />
          </div>

          <div className="flex items-center justify-end w-full gap-3 mt-6">
            <Button size="sm" variant="outline" type="button" onClick={closeModal}>
              Cancel
            </Button>
            <Button size="sm" type="submit" disabled={isSaving}>
              {isSaving ? "Saving..." : "Save"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={Boolean(deletingUser)}
        title="Delete User"
        message={`Are you sure you want to delete user "${deletingUser?.name || deletingUser?.email}"? This action cannot be undone.`}
        isDeleting={isDeleting}
        onConfirm={handleConfirmDelete}
        onClose={() => setDeletingUser(null)}
      />
    </>
  );
}
