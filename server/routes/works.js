/* eslint-env node */
import express from "express";
import { body, param } from "express-validator";
import Work from "../models/Work.js";
import { checkRole, verifyToken } from "../middleware/auth.js";
import validateRequest from "../middleware/validateRequest.js";

const router = express.Router();

const sanitizeLocalized = (value) => ({
  en: value?.en?.trim?.() ?? "",
  ru: value?.ru?.trim?.() ?? "",
});

const sanitizeWorkPayload = (payload) => {
  const title = sanitizeLocalized(payload.title);
  const description = sanitizeLocalized(payload.description);
  const imageUrl = payload.imageUrl?.trim?.() ?? "";
  const dimensions = payload.dimensions?.trim?.() ?? "";
  const category = payload.category?.trim?.() ?? "";
  const year = Number.parseInt(payload.year, 10);
  const price = Number.parseFloat(payload.price);

  if (!title.en || !title.ru) {
    throw Object.assign(new Error("Title is required in both languages"), { status: 400 });
  }

  if (!description.en || !description.ru) {
    throw Object.assign(new Error("Description is required in both languages"), { status: 400 });
  }

  if (!imageUrl) {
    throw Object.assign(new Error("Image URL is required"), { status: 400 });
  }

  if (!Number.isFinite(year)) {
    throw Object.assign(new Error("Year must be a valid number"), { status: 400 });
  }

  if (!dimensions) {
    throw Object.assign(new Error("Dimensions are required"), { status: 400 });
  }

  if (!Number.isFinite(price)) {
    throw Object.assign(new Error("Price must be a valid number"), { status: 400 });
  }

  if (!category) {
    throw Object.assign(new Error("Category is required"), { status: 400 });
  }

  return {
    title,
    description,
    imageUrl,
    year,
    dimensions,
    price,
    category,
  };
};

const workValidations = [
  body("title").isObject().withMessage("Title must include translations"),
  body("title.en").isString().trim().notEmpty().withMessage("English title is required"),
  body("title.ru").isString().trim().notEmpty().withMessage("Russian title is required"),
  body("description").isObject().withMessage("Description must include translations"),
  body("description.en").isString().trim().notEmpty().withMessage("English description is required"),
  body("description.ru").isString().trim().notEmpty().withMessage("Russian description is required"),
  body("imageUrl").isString().trim().isLength({ min: 1 }).withMessage("Image URL is required"),
  body("year").isInt({ min: 0 }).withMessage("Year must be a positive number"),
  body("dimensions").isString().trim().notEmpty().withMessage("Dimensions are required"),
  body("price").isFloat({ min: 0 }).withMessage("Price must be a number"),
  body("category").isString().trim().notEmpty().withMessage("Category is required"),
];

const workIdValidation = [param("id").isMongoId().withMessage("Invalid work id")];

router.get("/", async (_request, response, next) => {
  try {
    const works = await Work.find().sort({ createdAt: -1 }).lean();
    response.set("Cache-Control", "public, max-age=300, stale-while-revalidate=900");
    response.json(works);
  } catch (error) {
    next(error);
  }
});

router.get("/:id", workIdValidation, validateRequest, async (request, response, next) => {
  try {
    const work = await Work.findById(request.params.id).lean();

    if (!work) {
      response.status(404).json({ message: "Work not found" });
      return;
    }

    response.set("Cache-Control", "public, max-age=300, stale-while-revalidate=900");
    response.json(work);
  } catch (error) {
    next(error);
  }
});

router.post(
  "/",
  verifyToken,
  checkRole("admin"),
  workValidations,
  validateRequest,
  async (request, response, next) => {
    try {
    const data = sanitizeWorkPayload(request.body ?? {});
    const created = await Work.create(data);
    response.status(201).json(created.toObject());
  } catch (error) {
    next(error);
  }
  },
);

router.put(
  "/:id",
  verifyToken,
  checkRole("admin"),
  [...workIdValidation, ...workValidations],
  validateRequest,
  async (request, response, next) => {
    try {
    const data = sanitizeWorkPayload(request.body ?? {});

    const updated = await Work.findByIdAndUpdate(request.params.id, data, {
      new: true,
      runValidators: true,
    }).lean();

    if (!updated) {
      response.status(404).json({ message: "Work not found" });
      return;
    }

    response.json(updated);
  } catch (error) {
    next(error);
  }
  },
);

router.delete(
  "/:id",
  verifyToken,
  checkRole("admin"),
  workIdValidation,
  validateRequest,
  async (request, response, next) => {
    try {
    const deleted = await Work.findByIdAndDelete(request.params.id).lean();

    if (!deleted) {
      response.status(404).json({ message: "Work not found" });
      return;
    }

    response.status(204).send();
  } catch (error) {
    next(error);
  }
  },
);

export default router;
