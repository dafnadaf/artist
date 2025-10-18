/* eslint-env node */
import UserProfile from "../models/UserProfile.js";
import { getFirebaseAuth, isFirebaseAdminConfigured } from "../services/firebaseAdmin.js";

const DEFAULT_ROLE = "user";

const withErrorHandling = (middleware) => async (request, response, next) => {
  try {
    await middleware(request, response, next);
  } catch (error) {
    next(error);
  }
};

const verifyToken = withErrorHandling(async (request, response, next) => {
  const authorizationHeader = request.get("authorization") || "";

  if (!authorizationHeader.startsWith("Bearer ")) {
    response.status(401).json({ message: "Authentication token is missing" });
    return;
  }

  if (!isFirebaseAdminConfigured()) {
    response.status(500).json({ message: "Authentication service is not configured" });
    return;
  }

  const idToken = authorizationHeader.slice("Bearer ".length).trim();

  if (!idToken) {
    response.status(401).json({ message: "Authentication token is invalid" });
    return;
  }

  const auth = getFirebaseAuth();
  let decodedToken;

  try {
    decodedToken = await auth.verifyIdToken(idToken);
  } catch (error) {
    console.warn("Failed to verify Firebase token", error);
    response.status(401).json({ message: "Authentication token is invalid" });
    return;
  }

  const profile = await UserProfile.findOne({ uid: decodedToken.uid }).lean();
  const roles = Array.isArray(profile?.roles) && profile.roles.length > 0 ? profile.roles : [DEFAULT_ROLE];

  request.user = {
    uid: decodedToken.uid,
    email: decodedToken.email || profile?.email || null,
    roles,
    role: roles[0] || DEFAULT_ROLE,
    profile,
  };

  next();
});

const checkRole = (requiredRole) =>
  withErrorHandling((request, response, next) => {
    const roles = request.user?.roles ?? [];

    if (!roles.includes(requiredRole)) {
      response.status(403).json({ message: "Insufficient permissions" });
      return;
    }

    next();
  });

const requireSelfOrRole = (resolveTargetUid, elevatedRole = "admin") =>
  withErrorHandling((request, response, next) => {
    const currentUser = request.user;

    if (!currentUser) {
      response.status(401).json({ message: "Authentication required" });
      return;
    }

    const targetUid = resolveTargetUid(request);

    if (!targetUid) {
      response.status(403).json({ message: "Insufficient permissions" });
      return;
    }

    if (currentUser.uid === targetUid) {
      next();
      return;
    }

    if (elevatedRole && currentUser.roles?.includes(elevatedRole)) {
      next();
      return;
    }

    response.status(403).json({ message: "Insufficient permissions" });
  });

export { checkRole, requireSelfOrRole, verifyToken };
