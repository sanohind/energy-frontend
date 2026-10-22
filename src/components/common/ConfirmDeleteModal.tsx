import React from "react";
import { Modal } from "../ui/modal";
import Button from "../ui/button/Button";

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  isDeleting?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
  isOpen,
  title,
  message,
  isDeleting = false,
  onConfirm,
  onClose,
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-[480px] p-6 lg:p-8">
      <div className="text-center">
        <div className="relative flex items-center justify-center z-1 mb-5">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-error-50 dark:bg-error-500/15 text-error-500">
            <svg
              className="w-8 h-8 fill-none stroke-current"
              viewBox="0 0 24 24"
              strokeWidth="2"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
              />
            </svg>
          </div>
        </div>
        <h4 className="mb-2 text-xl font-semibold text-gray-800 dark:text-white/90">
          {title}
        </h4>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {message}
        </p>
        <div className="mt-7 flex items-center justify-center gap-3">
          <Button size="sm" variant="outline" type="button" onClick={onClose} disabled={isDeleting}>
            Cancel
          </Button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="rounded-lg bg-error-500 px-4 py-2.5 text-sm font-medium text-white shadow-theme-xs hover:bg-error-600 disabled:opacity-50 transition"
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default ConfirmDeleteModal;

