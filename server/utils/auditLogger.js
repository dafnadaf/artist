import AuditLog from "../models/AuditLog.js";

export async function recordAuditLog({ actor, action, entity, entityId, metadata, requestId }) {
  if (!action || !entity || !entityId) {
    return;
  }

  try {
    await AuditLog.create({
      actor: actor
        ? {
            uid: actor.uid || undefined,
            email: actor.email || undefined,
            roles: Array.isArray(actor.roles) && actor.roles.length > 0 ? actor.roles : undefined,
          }
        : undefined,
      action,
      entity,
      entityId,
      metadata: metadata && Object.keys(metadata).length > 0 ? metadata : undefined,
      requestId,
    });
  } catch (error) {
    console.error("Failed to record audit log", error);
  }
}
