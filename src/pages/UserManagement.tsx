import { useCallback, useEffect, useState, type FormEvent } from "react";
import { isAxiosError } from "axios";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import PageMeta from "../components/common/PageMeta";
import Button from "../components/ui/button/Button";
import Badge from "../components/ui/badge/Badge";
import { Modal } from "../components/ui/modal";
import { useModal } from "../hooks/useModal";
import Label from "../components/form/Label";
import Input from "../components/form/input/InputField";
import Checkbox from "../components/form/input/Checkbox";
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

export default function UserManagement() {
  const { user: currentUser } = useAuth();
  const { isOpen, openModal, closeModal } = useModal();
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [formError, setFormError] = useState("");
  const [listError, setListError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [editingUser, setEditingUser] = useState<AuthUser | null>(null);
  const [form, setForm] = useState<UserFormState>(emptyForm);

  const loadUsers = useCallback(async () => {
    try {
      setListError("");
      const response = await api.get<{ users: AuthUser[] }>("/users");
      setUsers(response.data.users);
    } catch {
      setListError("Unable to load users.");
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
      } else {
        await api.post("/users", form);
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
          firstError || err.response?.data?.message || "Unable to save user."
        );
      } else {
        setFormError("Unable to save user.");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (user: AuthUser) => {
    if (user.id === currentUser?.id) {
      return;
    }
    if (!window.confirm(`Delete user ${user.email}?`)) {
      return;
    }
    try {
      await api.delete(`/users/${user.id}`);
      await loadUsers();
    } catch (err) {
      if (isAxiosError(err)) {
        setListError(err.response?.data?.message || "Unable to delete user.");
      } else {
        setListError("Unable to delete user.");
      }
    }
  };

  return (
    <>
      <PageMeta
        title="User Management | Energy Monitoring"
        description="Create and manage Energy Monitoring users"
      />
      <PageBreadcrumb pageTitle="User Management" />

      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Create operator and admin accounts. There is no public registration.
          </p>
          <Button size="sm" onClick={openCreate}>
            Add user
          </Button>
        </div>

        {listError && (
          <div className="p-3 text-sm rounded-lg bg-error-50 text-error-500 dark:bg-error-500/10">
            {listError}
          </div>
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
                    <TableCell className="px-5 py-6 text-sm text-gray-500">
                      Loading users...
                    </TableCell>
                  </TableRow>
                ) : users.length === 0 ? (
                  <TableRow>
                    <TableCell className="px-5 py-6 text-sm text-gray-500">
                      No users found.
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user) => (
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
                            onClick={() => handleDelete(user)}
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
        </div>
      </div>

      <Modal
        isOpen={isOpen}
        onClose={closeModal}
        className="max-w-[584px] p-5 lg:p-10"
      >
        <form onSubmit={handleSubmit}>
          <h4 className="mb-6 text-lg font-medium text-gray-800 dark:text-white/90">
            {editingUser ? "Edit user" : "Add user"}
          </h4>

          {formError && (
            <div className="p-3 mb-5 text-sm rounded-lg bg-error-50 text-error-500 dark:bg-error-500/10">
              {formError}
            </div>
          )}

          <div className="space-y-5">
            <div>
              <Label>Name</Label>
              <Input
                type="text"
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
            <Button size="sm" variant="outline" onClick={closeModal}>
              Cancel
            </Button>
            <Button size="sm" type="submit" disabled={isSaving}>
              {isSaving ? "Saving..." : "Save"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
