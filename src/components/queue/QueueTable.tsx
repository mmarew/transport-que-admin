import type { DriverQueueEntry, QueueStatus } from "../../types/queue";

const STATUS_STYLES: Record<QueueStatus, string> = {
  waiting: "bg-yellow-100 text-yellow-800",
  offered: "bg-blue-100 text-blue-800",
  loaded: "bg-green-100 text-green-800",
  removed: "bg-slate-200 text-slate-500 line-through",
};

interface QueueTableProps {
  typeId: string;
  entries: DriverQueueEntry[];
  onOverride: (entry: DriverQueueEntry) => void;
  onRemove: (entry: DriverQueueEntry) => void;
}

export function QueueTable({ typeId, entries, onOverride, onRemove }: QueueTableProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-4 py-2">#</th>
            <th className="px-4 py-2">Driver</th>
            <th className="px-4 py-2">Phone</th>
            <th className="px-4 py-2">Joined</th>
            <th className="px-4 py-2">Status</th>
            <th className="px-4 py-2 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {entries.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                No drivers waiting
              </td>
            </tr>
          ) : (
            entries.map((entry) => (
              <tr key={entry.queueUniqueId} className="hover:bg-slate-50">
                <td className="px-4 py-2 font-mono text-slate-700">{entry.queueNumber}</td>
                <td className="px-4 py-2 font-medium text-slate-800">{entry.driverName}</td>
                <td className="px-4 py-2 text-slate-600">{entry.driverPhoneNumber}</td>
                <td className="px-4 py-2 text-slate-600">
                  {new Date(entry.joinedAt).toLocaleTimeString()}
                </td>
                <td className="px-4 py-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[entry.status]}`}>
                    {entry.status}
                  </span>
                </td>
                <td className="px-4 py-2 text-right">
                  {entry.status === "waiting" && (
                    <>
                      <button
                        onClick={() => onOverride(entry)}
                        className="mr-2 text-xs font-medium text-blue-600 hover:text-blue-800"
                      >
                        Override
                      </button>
                      <button
                        onClick={() => onRemove(entry)}
                        className="text-xs font-medium text-red-600 hover:text-red-800"
                      >
                        Cancel
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
      <p className="bg-slate-50 px-4 py-1.5 text-xs text-slate-400">vehicle type: {typeId}</p>
    </div>
  );
}
