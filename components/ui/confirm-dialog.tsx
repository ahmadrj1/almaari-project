import { Modal } from "./modal"
import { Button } from "./button"
import { AlertTriangle } from "lucide-react"

export interface ConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  variant?: "danger" | "primary"
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Yes",
  cancelText = "No",
  variant = "danger",
}: ConfirmDialogProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="flex flex-col items-center text-center">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-[#E53935]">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <h2 className="mb-2 text-xl font-semibold">{title}</h2>
        <p className="mb-6 text-sm text-gray-500">{message}</p>
        <div className="flex w-full gap-3">
          <Button variant="outline" fullWidth onClick={onClose}>
            {cancelText}
          </Button>
          <Button variant={variant} fullWidth onClick={() => {
            onConfirm()
            onClose()
          }}>
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
