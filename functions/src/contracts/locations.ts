import { Timestamp } from "firebase-admin/firestore";
import { LocationType } from "./enums";

export interface LocationDoc {
  name: string;
  code: string;
  type: LocationType;
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface CreateLocationInput {
  name: string;
  code: string;
  type: LocationType;
}