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

const CustomerSchema = new Schema(
  {
    name: { type: String },
    email: { type: String },
  },
  { _id: false },
);

const ShippingStatusSchema = new Schema(
  {
    code: { type: String },
    name: { type: String },
    description: { type: String },
    date: { type: Date },
    city: { type: String },
  },
  { _id: false },
);

const ShippingRecipientAddressSchema = new Schema(
  {
    postal_code: { type: String, required: true },
    address: { type: String, required: true },
    country_code: { type: String, default: "RU" },
    city: { type: String },
  },
  { _id: false },
);

const ShippingRecipientSchema = new Schema(
  {
    name: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String },
    address: { type: ShippingRecipientAddressSchema, required: true },
  },
  { _id: false },
);

const ShippingPvzSchema = new Schema(
  {
    code: { type: String, required: true },
    name: { type: String },
    address: { type: String },
    postalCode: { type: String },
    city: { type: String },
    schedule: { type: String },
    location: {
      lat: { type: Number },
      lon: { type: Number },
    },
    features: {
      cash: { type: Boolean },
      cashless: { type: Boolean },
      fitting: { type: Boolean },
    },
  },
  { _id: false },
);

const ShippingSchema = new Schema(
  {
    provider: {
      type: String,
      enum: ["cdek", "boxberry", "russianpost"],
      required: true,
    },
    type: {
      type: String,
      enum: ["pickup", "courier"],
      default: "courier",
    },
    serviceName: { type: String },
    tariffCode: { type: Schema.Types.Mixed },
    price: { type: Number, required: true, min: 0 },
    eta: {
      daysMin: { type: Number, min: 0 },
      daysMax: { type: Number, min: 0 },
    },
    pvz: { type: ShippingPvzSchema },
    recipient: { type: ShippingRecipientSchema, required: true },
    trackingNumber: { type: String },
    labelUrl: { type: String },
    status: { type: ShippingStatusSchema },
    history: { type: [ShippingStatusSchema], default: [] },
  },
  { _id: false },
);

const PaymentSchema = new Schema(
  {
    provider: {
      type: String,
      enum: ["yookassa", "tinkoff", "cloudpayments"],
      default: "yookassa",
    },
    status: {
      type: String,
      enum: ["awaiting", "succeeded", "canceled", "refunded"],
      default: "awaiting",
    },
    externalId: { type: String },
    paidAt: { type: Date },
    amount: { type: Number, min: 0 },
    currency: { type: String },
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
    shipping: { type: ShippingSchema, required: true },
    customer: { type: CustomerSchema },
    payment: { type: PaymentSchema },
    total: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: [
        "new",
        "awaiting_payment",
        "paid",
        "in_progress",
        "shipped",
        "delivered",
        "canceled",
      ],
      default: "new",
    },
    history: {
      type: [
        new Schema(
          {
            at: { type: Date, default: Date.now },
            status: { type: String },
            note: { type: String },
          },
          { _id: false },
        ),
      ],
      default: [],
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  },
);

const Order = mongoose.models.Order || mongoose.model("Order", OrderSchema);

export default Order;
