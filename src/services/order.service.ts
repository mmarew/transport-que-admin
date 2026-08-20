import { api } from "../lib/api";
import type { CreateOrderPayload, CreateOrderResponse } from "../types/queue";

/** Create a new shipper request (freight order) */
export const createShipperRequest = (body: CreateOrderPayload) =>
  api.post<CreateOrderResponse>("/shipperRequest/createRequest", body);
