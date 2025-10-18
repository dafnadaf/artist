import mongoose from "mongoose";

const ALLOWED_ROLES = ["user", "admin"];

const userProfileSchema = new mongoose.Schema(
  {
    uid: { type: String, required: true, unique: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, trim: true },
    roles: {
      type: [String],
      enum: ALLOWED_ROLES,
      default: ["user"],
      validate: {
        validator: (roles) => Array.isArray(roles) && roles.length > 0,
        message: "At least one role is required",
      },
    },
    avatarUrl: { type: String, trim: true },
    metadata: { type: mongoose.Schema.Types.Mixed },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        ret.id = ret._id;
        delete ret._id;
        return ret;
      },
      versionKey: false,
    },
    toObject: {
      virtuals: true,
    },
  },
);

userProfileSchema.virtual("role").get(function derivePrimaryRole() {
  if (Array.isArray(this.roles) && this.roles.length > 0) {
    return this.roles[0];
  }

  return "user";
});

const UserProfile = mongoose.models.UserProfile || mongoose.model("UserProfile", userProfileSchema);

export { ALLOWED_ROLES };
export default UserProfile;
