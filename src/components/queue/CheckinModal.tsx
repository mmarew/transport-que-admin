import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { manualCheckin } from "../../services/queue.service";
import { getApiError } from "../../lib/api";
import { checkinSchema, type CheckinFormValues } from "../../schemas/queue";

interface CheckinModalProps {
  queueOrganizationUniqueId: string;
  onClose: () => void;
}

export function CheckinModal({ queueOrganizationUniqueId, onClose }: CheckinModalProps) {
  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CheckinFormValues>({
    resolver: zodResolver(checkinSchema),
  });

  const mutation = useMutation({
    mutationFn: (values: CheckinFormValues) =>
      manualCheckin({
        queueOrganizationUniqueId,
        vehicleDriverUniqueId: values.vehicleDriverUniqueId,
        queueNumber: values.queueNumber,
      }),
    onSuccess: (res) => {
      toast.success(`Driver checked in at #${res.data.data.queueNumber}`);
      queryClient.invalidateQueries({ queryKey: ["queue-status", queueOrganizationUniqueId] });
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
        <h2 className="text-lg font-semibold text-slate-800">Manual check-in</h2>
        <div className="mt-4 space-y-3">
          <div>
            <label className="block text-sm font-medium text-slate-700">Vehicle-Driver ID</label>
            <input
              {...register("vehicleDriverUniqueId")}
              placeholder="vehicleDriverUniqueId"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
            {errors.vehicleDriverUniqueId && (
              <p className="mt-1 text-xs text-red-600">{errors.vehicleDriverUniqueId.message}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Queue number <span className="font-normal text-slate-400">(optional)</span>
            </label>
            <input
              type="number"
              min={1}
              {...register("queueNumber", { valueAsNumber: true })}
              placeholder="auto-assigned"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
            {errors.queueNumber && <p className="mt-1 text-xs text-red-600">{errors.queueNumber.message}</p>}
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
            {mutation.isPending ? "Checking in…" : "Check in"}
          </button>
        </div>
      </form>
    </div>
  );
}
