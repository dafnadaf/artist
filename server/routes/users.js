import { Router } from "express";
import UserProfile, { ALLOWED_ROLES } from "../models/UserProfile.js";

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

const hasAdminPrivileges = (request) => {
  const header = request.get("x-user-roles") || request.get("x-user-role") || "";

  return header
    .split(",")
    .map((role) => role.trim().toLowerCase())
    .filter(Boolean)
    .includes("admin");
};

const sanitizeProfilePayload = (payload, isAdmin, { applyDefaultRole = false } = {}) => {
  const uid = typeof payload?.uid === "string" ? payload.uid.trim() : undefined;
  const email = typeof payload?.email === "string" ? payload.email.trim().toLowerCase() : undefined;
  const name = typeof payload?.name === "string" ? payload.name.trim() : undefined;
  const avatarUrl = typeof payload?.avatarUrl === "string" ? payload.avatarUrl.trim() : undefined;
  const metadata = payload?.metadata && typeof payload.metadata === "object" ? payload.metadata : undefined;
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

router.post("/", async (request, response, next) => {
  try {
    const isAdmin = hasAdminPrivileges(request);
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
});

router.get("/", async (request, response, next) => {
  try {
    if (!hasAdminPrivileges(request)) {
      return response.status(403).json({ message: "Admin privileges required" });
    }

    const profiles = await UserProfile.find().sort({ createdAt: -1 }).lean({ virtuals: true });
    return response.json(profiles);
  } catch (error) {
    return next(error);
  }
});

router.get("/:uid", async (request, response, next) => {
  try {
    const profile = await UserProfile.findOne({ uid: request.params.uid }).lean({ virtuals: true });

    if (!profile) {
      return response.status(404).json({ message: "Profile not found" });
    }

    return response.json(profile);
  } catch (error) {
    return next(error);
  }
});

router.patch("/:uid", async (request, response, next) => {
  try {
    const isAdmin = hasAdminPrivileges(request);
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
});

export default router;
