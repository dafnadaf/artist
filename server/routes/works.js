/* eslint-env node */
import express from "express";
import Work from "../models/Work.js";

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

router.get("/", async (_request, response, next) => {
  try {
    const works = await Work.find().sort({ createdAt: -1 }).lean();
    response.json(works);
  } catch (error) {
    next(error);
  }
});

router.get("/:id", async (request, response, next) => {
  try {
    const work = await Work.findById(request.params.id).lean();

    if (!work) {
      response.status(404).json({ message: "Work not found" });
      return;
    }

    response.json(work);
  } catch (error) {
    next(error);
  }
});

router.post("/", async (request, response, next) => {
  try {
    const data = sanitizeWorkPayload(request.body ?? {});
    const created = await Work.create(data);
    response.status(201).json(created.toObject());
  } catch (error) {
    next(error);
  }
});

router.put("/:id", async (request, response, next) => {
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
});

router.delete("/:id", async (request, response, next) => {
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
});

export default router;
