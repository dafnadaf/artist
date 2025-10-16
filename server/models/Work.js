import mongoose from "mongoose";

const localizedStringSchema = new mongoose.Schema(
  {
    en: { type: String, required: true, trim: true },
    ru: { type: String, required: true, trim: true },
  },
  { _id: false },
);

const workSchema = new mongoose.Schema(
  {
    title: { type: localizedStringSchema, required: true },
    description: { type: localizedStringSchema, required: true },
    imageUrl: { type: String, required: true, trim: true },
    year: { type: Number, required: true },
    dimensions: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    category: { type: String, required: true, trim: true },
  },
  {
    timestamps: { createdAt: true, updatedAt: true },
  },
);

const Work = mongoose.model("Work", workSchema);

export default Work;
