import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { overrideEntry } from "../../services/queue.service";
import { getApiError } from "../../lib/api";
import { overrideSchema, type OverrideFormValues } from "../../schemas/queue";
import type { DriverQueueEntry } from "../../types/queue";

interface OverrideModalProps {
  entry: DriverQueueEntry;
  onClose: () => void;
}

export function OverrideModal({ entry, onClose }: OverrideModalProps) {
  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<OverrideFormValues>({
    resolver: zodResolver(overrideSchema),
    defaultValues: { queueNumber: entry.queueNumber },
  });

  const mutation = useMutation({
    mutationFn: (values: OverrideFormValues) =>
      overrideEntry(entry.queueUniqueId, {
        queueNumber: values.queueNumber,
        reason: values.reason || undefined,
      }),
    onSuccess: () => {
      toast.success("Position overridden");
      queryClient.invalidateQueries({ queryKey: ["queue-status"] });
      onClose();
    },
    onError: (err) => toast.error(getApiError(err)),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <form
        onSubmit={handleSubmit((values) => mutation.mutate(values))}
        className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl"
      >
        <h2 className="text-lg font-semibold text-slate-800">Override position</h2>
        <p className="mt-1 text-sm text-slate-500">
          {entry.driverName} — currently #{entry.queueNumber}
        </p>
        <div className="mt-4 space-y-3">
          <div>
            <label className="block text-sm font-medium text-slate-700">New queue number</label>
            <input
              type="number"
              min={1}
              {...register("queueNumber", { valueAsNumber: true })}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
            {errors.queueNumber && <p className="mt-1 text-xs text-red-600">{errors.queueNumber.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Reason <span className="font-normal text-slate-400">(audit logged)</span>
            </label>
            <textarea
              {...register("reason")}
              placeholder="e.g. physically first, app login failed"
              rows={3}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
            {errors.reason && <p className="mt-1 text-xs text-red-600">{errors.reason.message}</p>}
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={mutation.isPending}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {mutation.isPending ? "Saving…" : "Override"}
          </button>
        </div>
      </form>
    </div>
  );
}
