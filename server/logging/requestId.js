import { v4 as uuid } from "uuid";

export default function requestId(request, response, next) {
  if (!request.id) {
    request.id = uuid();
  }

  next();
}
