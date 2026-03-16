import { onCall, type CallableRequest } from "firebase-functions/v2/https";
import { CommandError } from "./errors";
import { makeRequestId } from "../utils/makeRequestId";
import { nowIso } from "./request";
import { logger } from "./logger";
import type { CommandCallableResponse } from "../contracts/common";

type Handler<TReq, TRes> = (args: {
 request: CallableRequest<TReq>;
 data: TReq;
 requestId: string;
}) => Promise<TRes>;

export function makeCallable<TReq, TRes>(handler: Handler<TReq, TRes>) {
 return onCall(async (request: CallableRequest<TReq>): Promise<CommandCallableResponse<TRes>> => {
   const requestId = makeRequestId();
   const serverTime = nowIso();

   try {
     const data = request.data;
     const result = await handler({ request, data, requestId });

     return {
       ok: true,
       meta: {
         requestId,
         serverTime
       },
       data: result
     };
   } catch (error) {
     logger.error("Callable failed", { requestId, error });

     if (error instanceof CommandError) {
       return {
         ok: false,
         meta: {
           requestId,
           serverTime
         },
         error: {
           code: error.code,
           message: error.message,
           fieldErrors: error.fieldErrors
         }
       };
     }

     return {
       ok: false,
       meta: {
         requestId,
         serverTime
       },
       error: {
         code: "internal",
         message: "An unexpected error occurred."
       }
     };
   }
 });
}
