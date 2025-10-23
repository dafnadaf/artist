import mongoose from "mongoose";

const { Schema } = mongoose;

const AuditActorSchema = new Schema(
  {
    uid: { type: String },
    email: { type: String },
    roles: { type: [String], default: undefined },
  },
  { _id: false },
);

const AuditLogSchema = new Schema(
  {
    actor: { type: AuditActorSchema, default: undefined },
    action: { type: String, required: true },
    entity: { type: String, required: true },
    entityId: { type: String, required: true },
    metadata: { type: Schema.Types.Mixed },
    requestId: { type: String },
    createdAt: { type: Date, default: Date.now },
  },
  { versionKey: false },
);

AuditLogSchema.index({ entity: 1, entityId: 1, createdAt: -1 });

const AuditLog = mongoose.models.AuditLog || mongoose.model("AuditLog", AuditLogSchema);

export default AuditLog;
