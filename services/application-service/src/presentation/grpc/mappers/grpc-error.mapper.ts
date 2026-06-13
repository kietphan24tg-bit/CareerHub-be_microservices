import { ApplicationError, mapErrorToRpcException } from '@careerhub/infrastructure';

import { ValidationError } from '@careerhub/shared-kernel';

import { RpcException } from '@nestjs/microservices';



const GRPC_INVALID_ARGUMENT_STATUS_CODE = 3;

const GRPC_NOT_FOUND_STATUS_CODE = 5;

const GRPC_ALREADY_EXISTS_STATUS_CODE = 6;

const GRPC_PERMISSION_DENIED_STATUS_CODE = 7;



const GRPC_STATUS_CODE_BY_APPLICATION_ERROR: Record<string, number> = {

  APPLICATION_NOT_FOUND: GRPC_NOT_FOUND_STATUS_CODE,

  DUPLICATE_APPLICATION: GRPC_ALREADY_EXISTS_STATUS_CODE,

  FORBIDDEN_APPLICATION_ACCESS: GRPC_PERMISSION_DENIED_STATUS_CODE,

  INTERVIEW_APPLICATION_STATE_INVALID: GRPC_INVALID_ARGUMENT_STATUS_CODE,

  INTERVIEW_NOT_FOUND: GRPC_NOT_FOUND_STATUS_CODE,

  INTERVIEW_RESPONSE_STATE_INVALID: GRPC_INVALID_ARGUMENT_STATUS_CODE,

  INTERVIEW_STATE_INVALID: GRPC_INVALID_ARGUMENT_STATUS_CODE,

  INVALID_APPLICATION_STATUS_TRANSITION: GRPC_INVALID_ARGUMENT_STATUS_CODE,

  OFFER_ACCEPT_STATE_INVALID: GRPC_INVALID_ARGUMENT_STATUS_CODE,

  OFFER_ALREADY_EXISTS: GRPC_ALREADY_EXISTS_STATUS_CODE,

  OFFER_APPLICATION_STATE_INVALID: GRPC_INVALID_ARGUMENT_STATUS_CODE,

  OFFER_DECLINE_STATE_INVALID: GRPC_INVALID_ARGUMENT_STATUS_CODE,

  OFFER_EXPIRATION_REQUIRED: GRPC_INVALID_ARGUMENT_STATUS_CODE,

  OFFER_NOT_FOUND: GRPC_NOT_FOUND_STATUS_CODE,

  OFFER_SEND_STATE_INVALID: GRPC_INVALID_ARGUMENT_STATUS_CODE,

  OFFER_STATE_INVALID: GRPC_INVALID_ARGUMENT_STATUS_CODE

};



export function mapErrorToApplicationGrpcException(error: unknown): RpcException {

  if (error instanceof ValidationError) {

    return new RpcException({

      code: GRPC_INVALID_ARGUMENT_STATUS_CODE,

      details: error.details,

      message: error.message

    });

  }



  if (error instanceof ApplicationError) {

    const grpcStatusCode = GRPC_STATUS_CODE_BY_APPLICATION_ERROR[error.code];



    if (grpcStatusCode !== undefined) {

      return new RpcException({

        code: grpcStatusCode,

        details: error.details,

        message: error.message

      });

    }

  }



  return mapErrorToRpcException(error);

}

