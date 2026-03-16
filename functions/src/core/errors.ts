import { HttpsError } from "firebase-functions/v2/https";
import type { FieldError } from "../contracts/common";

export class CommandError extends Error {
 public readonly code: string;
 public readonly httpCode:
   | "invalid-argument"
   | "unauthenticated"
   | "permission-denied"
   | "not-found"
   | "already-exists"
   | "failed-precondition"
   | "aborted"
   | "internal";
 public readonly fieldErrors?: FieldError[];

 constructor(params: {
   code: string;
   message: string;
   httpCode:
     | "invalid-argument"
     | "unauthenticated"
     | "permission-denied"
     | "not-found"
     | "already-exists"
     | "failed-precondition"
     | "aborted"
     | "internal";
   fieldErrors?: FieldError[];
 }) {
   super(params.message);
   this.code = params.code;
   this.httpCode = params.httpCode;
   this.fieldErrors = params.fieldErrors;
 }

 toHttpsError(): HttpsError {
   return new HttpsError(this.httpCode, this.message, {
     code: this.code,
     fieldErrors: this.fieldErrors
   });
 }
}

export function invalidArgument(
 code: string,
 message: string,
 fieldErrors?: FieldError[]
): never {
 throw new CommandError({
   code,
   message,
   httpCode: "invalid-argument",
   fieldErrors
 });
}

export function unauthenticated(code: string, message: string): never {
 throw new CommandError({
   code,
   message,
   httpCode: "unauthenticated"
 });
}

export function permissionDenied(code: string, message: string): never {
 throw new CommandError({
   code,
   message,
   httpCode: "permission-denied"
 });
}

export function notFound(code: string, message: string): never {
 throw new CommandError({
   code,
   message,
   httpCode: "not-found"
 });
}

export function failedPrecondition(code: string, message: string): never {
 throw new CommandError({
   code,
   message,
   httpCode: "failed-precondition"
 });
}

export function alreadyExists(code: string, message: string): never {
 throw new CommandError({
   code,
   message,
   httpCode: "already-exists"
 });
}
