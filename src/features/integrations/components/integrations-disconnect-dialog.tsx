import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface DisconnectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  email?: string | undefined;
  onConfirm: () => void;
}

export function IntegrationsDisconnectDialog({
  open,
  onOpenChange,
  email,
  onConfirm,
}: DisconnectDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-white rounded-2xl p-6">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-slate-900">
            Disconnect Google Account?
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Are you sure you want to unlink <strong className="text-slate-700">{email}</strong>?
          </DialogDescription>
        </DialogHeader>
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-800 text-xs space-y-1 my-2">
          <p className="font-semibold">Effect of Disconnection:</p>
          <ul className="list-disc list-inside space-y-0.5 text-[11px] text-red-700">
            <li>Active scheduled synchronization jobs will be stopped.</li>
            <li>Existing resource mappings will be unlinked.</li>
            <li>Other workspaces are unaffected; credentials are scoped per client tenant.</li>
          </ul>
        </div>
        <DialogFooter className="flex items-center justify-end gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button size="sm" onClick={onConfirm} className="bg-red-600 hover:bg-red-700 text-white font-semibold">
            Confirm Disconnect
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
