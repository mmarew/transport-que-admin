import React from "react";
import type { OrderDisplayItem } from "./OrdersTypes";
import { DriverBidsModal } from "./DriverBidsModal";
import { CreateOrderModal } from "../queue/CreateOrderModal";
import { OrdersEditModal } from "./OrdersEditModal";
import { OrdersDeleteModal } from "./OrdersDeleteModal";

export interface OrdersModalsProps {
  currentViewingOrder: OrderDisplayItem | null;
  activeOrg: {
    queueOrganizationUniqueId?: string;
    latitude?: number | string | null;
    longitude?: number | string | null;
    queueOrganizationAddress?: string | null;
  } | null;
  onCloseViewing: () => void;
  onRefresh: () => void;

  showCreateModal: boolean;
  onCloseCreate: () => void;
  onOrderCreated: () => void;

  editingOrder: OrderDisplayItem | null;
  onCloseEdit: () => void;
  onSaveEdit: (e: React.FormEvent<HTMLFormElement>) => void;

  deletingOrder: OrderDisplayItem | null;
  onCloseDelete: () => void;
  onConfirmDelete: () => void;
}

export function OrdersModals({
  currentViewingOrder,
  activeOrg,
  onCloseViewing,
  onRefresh,
  showCreateModal,
  onCloseCreate,
  onOrderCreated,
  editingOrder,
  onCloseEdit,
  onSaveEdit,
  deletingOrder,
  onCloseDelete,
  onConfirmDelete,
}: OrdersModalsProps) {
  const origin = React.useMemo(() => {
    return {
      latitude: activeOrg?.latitude != null ? Number(activeOrg.latitude) : null,
      longitude:
        activeOrg?.longitude != null ? Number(activeOrg.longitude) : null,
      description:
        activeOrg?.queueOrganizationAddress || "Cement Factory, Addis Ababa",
    };
  }, [
    activeOrg?.latitude,
    activeOrg?.longitude,
    activeOrg?.queueOrganizationAddress,
  ]);

  return (
    <>
      {/* ── Driver Bids & Requests Modal ── */}
      {currentViewingOrder && (
        <DriverBidsModal
          order={currentViewingOrder}
          driverRequests={currentViewingOrder.driverRequests || []}
          queueOrganizationUniqueId={
            activeOrg?.queueOrganizationUniqueId ||
            currentViewingOrder.queueOrganizationUniqueId ||
            ""
          }
          onClose={() => {
            onCloseViewing();
            onRefresh();
          }}
          onOrderUpdated={onRefresh}
        />
      )}

      {/* ── Create Modal ── */}
      {showCreateModal && (
        <CreateOrderModal
          queueOrganizationUniqueId={activeOrg?.queueOrganizationUniqueId || ""}
          origin={origin}
          onClose={onCloseCreate}
          onCreated={() => {
            onCloseCreate();
            onOrderCreated();
          }}
        />
      )}

      {/* ── Edit Modal ── */}
      {editingOrder && (
        <OrdersEditModal
          order={editingOrder}
          onClose={onCloseEdit}
          onSave={onSaveEdit}
        />
      )}

      {/* ── Delete Modal ── */}
      {deletingOrder && (
        <OrdersDeleteModal
          order={deletingOrder}
          onClose={onCloseDelete}
          onConfirm={onConfirmDelete}
        />
      )}
    </>
  );
}

export default OrdersModals;
