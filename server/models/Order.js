import mongoose from "mongoose";

const { Schema } = mongoose;

const OrderItemSchema = new Schema(
  {
    workId: { type: String, required: true },
    title: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
  },
  { _id: false },
);

const DeliverySchema = new Schema(
  {
    type: {
      type: String,
      required: true,
      enum: ["standard", "express", "international", "pickup", "courier", "mail"],
      default: "standard",
    },
    address: { type: String, required: true },
    cost: { type: Number, default: 0, min: 0 },
  },
  { _id: false },
);

const CustomerSchema = new Schema(
  {
    name: { type: String },
    email: { type: String },
  },
  { _id: false },
);

const OrderSchema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    items: {
      type: [OrderItemSchema],
      validate: {
        validator: (value) => Array.isArray(value) && value.length > 0,
        message: "Order must include at least one item.",
      },
    },
    delivery: { type: DeliverySchema, required: true },
    customer: { type: CustomerSchema },
    status: {
      type: String,
      enum: ["new", "in_progress", "shipped"],
      default: "new",
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  },
);

const Order = mongoose.models.Order || mongoose.model("Order", OrderSchema);

export default Order;
