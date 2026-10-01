import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";
import { useApproveBiddingMutation } from "@/lib/redux/api";
import { useAuth } from "@/context/AuthContext";
import { QUEUE_ORG_ADMIN_ROLE } from "@/types/queue";
import parseError from "@/utils/parseError";

interface BiddingBoardToggleProps {
  shipperRequestUniqueId?: string;
  isBiddingApproved?: boolean | null;
  onChanged?: () => void;
}

/**
 * Open / close the bidding board for one order.
 *
 * The gate is `ShipperRequest.isBiddingApproved` and it is deliberately
 * per-order, not per-batch, so orders inside a single batch can diverge — some
 * FIFO while others are auctioned. This control therefore acts on exactly one
 * order id.
 *
 * Authorization mirrors Services/DriverBid.service.js: shipper owner,
 * SuperAdmin, or an active QueueOrgAdmin (role 11). Role 12 (QueueDispatcher)
 * is NOT permitted — the backend returns 403, so the control is hidden for them
 * rather than offered and then rejected.
 */
export function BiddingBoardToggle({
  shipperRequestUniqueId,
  isBiddingApproved,
  onChanged,
}: BiddingBoardToggleProps) {
  const { t } = useTranslation();
  const { auth } = useAuth();
  const [openBiddingMutation, { isLoading }] = useApproveBiddingMutation();

  const isOpen = Boolean(isBiddingApproved);
  const isQueueOrgAdmin = auth?.userData?.roleId === QUEUE_ORG_ADMIN_ROLE;

  if (!shipperRequestUniqueId) return null;

  const toggle = async () => {
    const next = !isOpen;
    try {
      const res = await openBiddingMutation({
        shipperRequestUniqueIds: [shipperRequestUniqueId],
        approved: next,
      }).unwrap();

      const matched = res?.data?.waitingMatched;
      toast.success(
        next
          ? t("orders.biddingBoardOpened", "Bidding board opened for this order.")
          : t("orders.biddingBoardClosed", "Bidding board closed for this order."),
      );

      // Opening the board distance-matches still-waiting orders to nearby
      // drivers, so the number is not just a flag — it is work that happened.
      if (next && typeof matched === "number" && matched > 0) {
        toast.info(
          t("orders.biddingMatchedDrivers", {
            defaultValue: "{{count}} waiting order(s) matched to nearby drivers.",
            count: matched,
          }),
        );
      }
      onChanged?.();
    } catch (err: unknown) {
      toast.error(parseError(err));
    }
  };

  return (
    <div className="dbm-board-toggle">
      <button
        type="button"
        className={`dbm-btn ${isOpen ? "dbm-btn--secondary" : "dbm-btn--primary"}`}
        onClick={toggle}
        disabled={isLoading || !isQueueOrgAdmin}
        title={
          isQueueOrgAdmin
            ? undefined
            : t(
                "orders.biddingToggleNotAllowed",
                "Only a Queue Org Admin can open or close the bidding board.",
              )
        }
      >
        {isOpen ? <EyeOff size={15} /> : <Eye size={15} />}
        {isLoading
          ? t("common.loading", "Loading...")
          : isOpen
            ? t("orders.closeBiddingBoard", "Close bidding")
            : t("orders.openBiddingBoard", "Open for bidding")}
      </button>
      {!isQueueOrgAdmin && (
        <span className="dbm-board-toggle-hint">
          {t(
            "orders.biddingToggleNotAllowed",
            "Only a Queue Org Admin can open or close the bidding board.",
          )}
        </span>
      )}
    </div>
  );
}

export default BiddingBoardToggle;