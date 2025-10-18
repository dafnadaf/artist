import { useEffect } from "react";
import PropTypes from "prop-types";
import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";

const setMetaContent = (attribute, name, value) => {
  if (!value) {
    return;
  }

  if (typeof document === "undefined") {
    return;
  }

  let meta = document.head.querySelector(`meta[${attribute}="${name}"]`);

  if (!meta) {
    meta = document.createElement("meta");
    meta.setAttribute(attribute, name);
    document.head.appendChild(meta);
  }

  meta.setAttribute("content", value);
};

function Seo({ titleKey, descriptionKey, image, translationValues, url, keywordsKey }) {
  const { t } = useTranslation();
  const location = useLocation();

  useEffect(() => {
    if (typeof document === "undefined") {
      return undefined;
    }

    const resolvedTitle = titleKey ? t(titleKey, translationValues) : "";
    const resolvedDescription = descriptionKey ? t(descriptionKey, translationValues) : "";
    const resolvedKeywords = keywordsKey ? t(keywordsKey, translationValues) : "";

    if (resolvedTitle) {
      document.title = resolvedTitle;
    }

    if (resolvedDescription) {
      setMetaContent("name", "description", resolvedDescription);
    }

    if (resolvedKeywords) {
      setMetaContent("name", "keywords", resolvedKeywords);
    }

    const origin = typeof window !== "undefined" && window.location ? window.location.origin : "";
    const canonicalUrl = url || (origin ? `${origin}${location.pathname}` : "");

    if (canonicalUrl) {
      setMetaContent("property", "og:url", canonicalUrl);
      let link = document.head.querySelector('link[rel="canonical"]');
      if (!link) {
        link = document.createElement("link");
        link.setAttribute("rel", "canonical");
        document.head.appendChild(link);
      }
      link.setAttribute("href", canonicalUrl);
    }

    if (resolvedTitle) {
      setMetaContent("property", "og:title", resolvedTitle);
      setMetaContent("name", "twitter:title", resolvedTitle);
    }

    if (resolvedDescription) {
      setMetaContent("property", "og:description", resolvedDescription);
      setMetaContent("name", "twitter:description", resolvedDescription);
    }

    const imageUrl = image || (origin ? `${origin}/assets/og-cover.png` : "");

    if (imageUrl) {
      setMetaContent("property", "og:image", imageUrl);
      setMetaContent("name", "twitter:image", imageUrl);
    }

    setMetaContent("name", "twitter:card", "summary_large_image");

    return undefined;
  }, [titleKey, descriptionKey, image, translationValues, url, keywordsKey, t, location.pathname]);

  return null;
}

Seo.propTypes = {
  titleKey: PropTypes.string,
  descriptionKey: PropTypes.string,
  keywordsKey: PropTypes.string,
  image: PropTypes.string,
  translationValues: PropTypes.object,
  url: PropTypes.string,
};

Seo.defaultProps = {
  titleKey: "",
  descriptionKey: "",
  keywordsKey: "",
  image: "",
  translationValues: undefined,
  url: "",
};

export default Seo;
