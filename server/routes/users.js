import { Router } from "express";
import { body, param } from "express-validator";
import UserProfile, { ALLOWED_ROLES } from "../models/UserProfile.js";
import { checkRole, requireSelfOrRole, verifyToken } from "../middleware/auth.js";
import validateRequest from "../middleware/validateRequest.js";

const router = Router();

const DEFAULT_ROLE = "user";

const normalizeRoles = (roles) => {
  if (!roles) {
    return [DEFAULT_ROLE];
  }

  const roleList = Array.isArray(roles) ? roles : [roles];
  const filtered = roleList
    .map((role) => String(role || "").trim().toLowerCase())
    .filter((role) => ALLOWED_ROLES.includes(role));

  if (filtered.length === 0) {
    return [DEFAULT_ROLE];
  }

  return Array.from(new Set(filtered));
};

const isPlainObject = (value) => value && typeof value === "object" && !Array.isArray(value);

const hasUnsafeKeys = (value) =>
  Object.keys(value || {}).some((key) => key.startsWith("$") || key.includes("."));

const sanitizeProfilePayload = (payload, isAdmin, { applyDefaultRole = false } = {}) => {
  const uid = typeof payload?.uid === "string" ? payload.uid.trim() : undefined;
  const email = typeof payload?.email === "string" ? payload.email.trim().toLowerCase() : undefined;
  const name = typeof payload?.name === "string" ? payload.name.trim() : undefined;
  const avatarUrl = typeof payload?.avatarUrl === "string" ? payload.avatarUrl.trim() : undefined;
  const metadata =
    payload?.metadata && isPlainObject(payload.metadata) && !hasUnsafeKeys(payload.metadata)
      ? JSON.parse(JSON.stringify(payload.metadata))
      : undefined;
  const hasRoles = payload?.roles !== undefined || payload?.role !== undefined;
  const normalizedRoles = hasRoles ? normalizeRoles(payload?.roles ?? payload?.role) : undefined;

  return {
    uid,
    email,
    name,
    avatarUrl,
    metadata,
    roles:
      hasRoles || applyDefaultRole
        ? isAdmin
          ? normalizedRoles ?? [DEFAULT_ROLE]
          : [DEFAULT_ROLE]
        : undefined,
  };
};

const roleValidators = (field, message = "Invalid role") =>
  body(field)
    .optional()
    .custom((value) => {
      const values = Array.isArray(value) ? value : [value];
      const isValid = values.every((role) => ALLOWED_ROLES.includes(String(role || "").trim().toLowerCase()));

      if (!isValid) {
        throw new Error(message);
      }

      return true;
    });

const createUserValidations = [
  body("uid")
    .isString()
    .trim()
    .notEmpty()
    .withMessage("uid is required")
    .bail()
    .custom((value) => {
      if (value.includes("$") || value.includes(".")) {
        throw new Error("uid contains invalid characters");
      }

      return true;
    }),
  body("email").isEmail().withMessage("email must be valid"),
  body("name").optional().isString().trim().isLength({ min: 1 }).withMessage("name must be a string"),
  body("avatarUrl")
    .optional()
    .isURL({ require_protocol: true })
    .withMessage("avatarUrl must be a valid URL"),
  body("metadata")
    .optional()
    .custom((value) => {
      if (!isPlainObject(value) || hasUnsafeKeys(value)) {
        throw new Error("metadata must be a plain object without reserved keys");
      }

      return true;
    }),
  roleValidators("roles", "roles must contain valid values"),
  roleValidators("role", "role must be valid"),
];

const updateUserValidations = [
  body("email").optional().isEmail().withMessage("email must be valid"),
  body("name").optional().isString().trim().isLength({ min: 1 }).withMessage("name must be a string"),
  body("avatarUrl")
    .optional()
    .isURL({ require_protocol: true })
    .withMessage("avatarUrl must be a valid URL"),
  body("metadata")
    .optional()
    .custom((value) => {
      if (!isPlainObject(value) || hasUnsafeKeys(value)) {
        throw new Error("metadata must be a plain object without reserved keys");
      }

      return true;
    }),
  roleValidators("roles", "roles must contain valid values"),
  roleValidators("role", "role must be valid"),
];

const uidParamValidation = [
  param("uid")
    .isString()
    .trim()
    .notEmpty()
    .withMessage("uid parameter is required")
    .bail()
    .custom((value) => {
      if (value.includes("$") || value.includes(".")) {
        throw new Error("uid parameter contains invalid characters");
      }

      return true;
    }),
];

router.post(
  "/",
  verifyToken,
  createUserValidations,
  validateRequest,
  requireSelfOrRole((request) => request.body.uid, "admin"),
  async (request, response, next) => {
    try {
      const isAdmin = request.user?.roles?.includes("admin");
      const { uid, email, name, avatarUrl, metadata, roles } = sanitizeProfilePayload(request.body, isAdmin, {
        applyDefaultRole: true,
      });

      if (!uid) {
        return response.status(400).json({ message: "uid is required" });
      }

      if (!email) {
        return response.status(400).json({ message: "email is required" });
      }

      const existingProfile = await UserProfile.findOne({
        $or: [{ uid }, { email }],
      }).lean();

      if (existingProfile) {
        return response.status(409).json({ message: "Profile already exists" });
      }

      const profile = await UserProfile.create({ uid, email, name, avatarUrl, metadata, roles });
      return response.status(201).json(profile);
    } catch (error) {
      return next(error);
    }
  },
);

router.get("/", verifyToken, checkRole("admin"), async (request, response, next) => {
  try {
    const profiles = await UserProfile.find().sort({ createdAt: -1 }).lean({ virtuals: true });
    return response.json(profiles);
  } catch (error) {
    return next(error);
  }
});

router.get(
  "/:uid",
  verifyToken,
  uidParamValidation,
  validateRequest,
  requireSelfOrRole((request) => request.params.uid, "admin"),
  async (request, response, next) => {
    try {
      const profile = await UserProfile.findOne({ uid: request.params.uid }).lean({ virtuals: true });

      if (!profile) {
        return response.status(404).json({ message: "Profile not found" });
      }

      return response.json(profile);
    } catch (error) {
      return next(error);
    }
  },
);

router.patch(
  "/:uid",
  verifyToken,
  uidParamValidation,
  updateUserValidations,
  validateRequest,
  requireSelfOrRole((request) => request.params.uid, "admin"),
  async (request, response, next) => {
    try {
      const isAdmin = request.user?.roles?.includes("admin");
      const updates = sanitizeProfilePayload(request.body, isAdmin);

      if (updates.email) {
        const duplicate = await UserProfile.findOne({
          email: updates.email,
          uid: { $ne: request.params.uid },
        }).lean();

        if (duplicate) {
          return response.status(409).json({ message: "Email already in use" });
        }
      }

      delete updates.uid;

      const filteredUpdates = Object.fromEntries(
        Object.entries(updates).filter(([, value]) => value !== undefined),
      );

      const profile = await UserProfile.findOneAndUpdate({ uid: request.params.uid }, filteredUpdates, {
        new: true,
        runValidators: true,
      }).lean({ virtuals: true });

      if (!profile) {
        return response.status(404).json({ message: "Profile not found" });
      }

      return response.json(profile);
    } catch (error) {
      return next(error);
    }
  },
);

export default router;
