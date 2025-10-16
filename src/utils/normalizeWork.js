const ensureLocalized = (value) => {
  if (!value) {
    return { en: "", ru: "" };
  }

  if (typeof value === "string") {
    return { en: value, ru: value };
  }

  return {
    en: value.en ?? "",
    ru: value.ru ?? "",
  };
};

const normalizeWork = (work) => {
  if (!work) {
    return null;
  }

  const id = work._id ?? work.id ?? "";
  const year = Number.parseInt(work.year, 10);
  const price = Number.parseFloat(work.price);
  const imageUrl = work.imageUrl ?? work.image ?? "";

  return {
    ...work,
    id: id ? String(id) : "",
    _id: id ? String(id) : undefined,
    title: ensureLocalized(work.title),
    description: ensureLocalized(work.description),
    image: work.image ?? imageUrl,
    imageUrl,
    year: Number.isFinite(year) ? year : 0,
    price: Number.isFinite(price) ? price : 0,
    dimensions: work.dimensions ?? "",
    category: work.category ?? "",
  };
};

export default normalizeWork;
