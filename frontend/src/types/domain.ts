export type ItemStatus = "AVAILABLE" | "ON_LOAN";
export type RequestStatus = "PENDING" | "FULFILLED";

export interface ItemRef {
  id: string;
  assetTag: string;
  name: string;
}

export interface PersonRef {
  id: string;
  username: string;
  displayName: string;
}

export interface CatalogItem extends ItemRef {
  description: string;
  status: ItemStatus;
  managedBy: string;
  createdAt: string;
}

// GET /api/requests/mine
export interface MyRequest {
  id: string;
  itemId: string;
  status: RequestStatus;
  createdAt: string;
  fulfilledAt: string | null;
  item: ItemRef;
}

// GET /api/loans/mine
export interface MyLoan {
  id: string;
  itemId: string;
  requestId: string;
  custodianId: string;
  status: "ACTIVE";
  checkedOutAt: string;
  item: ItemRef;
}

// GET /api/requests (custodian)
export interface ManagedRequest {
  id: string;
  itemId: string;
  borrowerId: string;
  status: RequestStatus;
  createdAt: string;
  fulfilledAt: string | null;
  borrower: PersonRef;
  item: ItemRef;
}

// GET /api/loans (custodian)
export interface ManagedLoan {
  id: string;
  itemId: string;
  borrowerId: string;
  requestId: string;
  custodianId: string;
  status: "ACTIVE";
  checkedOutAt: string;
  borrower: PersonRef;
  item: ItemRef;
}