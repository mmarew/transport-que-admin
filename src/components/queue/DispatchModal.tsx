import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { dispatch, getApiError } from "../../lib/api";
import { dispatchSchema, type DispatchFormValues } from "../../schemas/queue";

interface DispatchModalProps {
  queueOrganizationUniqueId: string;
  vehicleTypeId: string;
  onClose: () => void;
}

export function DispatchModal({ queueOrganizationUniqueId, vehicleTypeId, onClose }: DispatchModalProps) {
  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<DispatchFormValues>({
    resolver: zodResolver(dispatchSchema),
  });

  const mutation = useMutation({
    mutationFn: (values: DispatchFormValues) =>
      dispatch({
        queueOrganizationUniqueId,
        vehicleTypeUniqueId: vehicleTypeId,
        shipperRequestUniqueId: values.shipperRequestUniqueId,
      }),
    onSuccess: (res) => {
      toast.success(`Offered to driver #${res.data.data.queueNumber}`);
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
        <h2 className="text-lg font-semibold text-slate-800">Dispatch to front driver</h2>
        <p className="mt-1 text-sm text-slate-500">Vehicle type: {vehicleTypeId}</p>
        <div className="mt-4">
          <label className="block text-sm font-medium text-slate-700">
            Shipper request ID <span className="font-normal text-slate-400">(optional)</span>
          </label>
          <input
            {...register("shipperRequestUniqueId")}
            placeholder="shipperRequestUniqueId"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
          {errors.shipperRequestUniqueId && (
            <p className="mt-1 text-xs text-red-600">{errors.shipperRequestUniqueId.message}</p>
          )}
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
            {mutation.isPending ? "Dispatching…" : "Dispatch"}
          </button>
        </div>
      </form>
    </div>
  );
}
