import { Timestamp } from "firebase-admin/firestore";

export interface FieldError {
  field: string;
  message: string;
}

export interface CommandCallableResponse<T = unknown> {
  ok: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    fieldErrors?: FieldError[];
  };
  meta?: {
    requestId?: string;
    timestamp?: string;
    serverTime?: string;
  };
}

export interface AuditFields {
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface AuthedCallableContext {
  uid: string;
  email?: string;
  displayName?: string;
  requestId: string;
}