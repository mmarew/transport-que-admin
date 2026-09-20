export interface CheckinDriverItem {
  vehicleDriverUniqueId: string;
  vehicleTypeUniqueId: string;
  driverName: string;
  driverPhoneNumber: string;
  vehicleTypeName: string;
  isInQueue?: boolean;
}

export interface CheckinModalProps {
  queueOrganizationUniqueId: string;
  onCheckedIn?: () => void;
  onClose: () => void;
}
