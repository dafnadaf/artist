/* eslint-env node */
import { validationResult } from "express-validator";

const validateRequest = (request, response, next) => {
  const errors = validationResult(request);

  if (!errors.isEmpty()) {
    response.status(422).json({
      message: "Validation failed",
      errors: errors.array().map((error) => ({
        field: error.param,
        message: error.msg,
      })),
    });
    return;
  }

  next();
};

export default validateRequest;
