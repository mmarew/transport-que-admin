import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { removeEntry, getApiError } from "../../lib/api";
import type { DriverQueueEntry } from "../../types/queue";

interface ConfirmCancelProps {
  entry: DriverQueueEntry;
  onClose: () => void;
}

export function ConfirmCancel({ entry, onClose }: ConfirmCancelProps) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => removeEntry(entry.queueUniqueId),
    onSuccess: () => {
      toast.success(`${entry.driverName} removed from queue`);
      queryClient.invalidateQueries({ queryKey: ["queue-status"] });
      onClose();
    },
    onError: (err) => toast.error(getApiError(err)),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-slate-800">Cancel driver from queue</h2>
        <p className="mt-1 text-sm text-slate-500">
          Remove <span className="font-medium">{entry.driverName}</span> (#{entry.queueNumber}) from
          the line? This is audit-logged.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-md px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
          >
            Keep
          </button>
          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
          >
            {mutation.isPending ? "Removing…" : "Cancel driver"}
          </button>
        </div>
      </div>
    </div>
  );
}
