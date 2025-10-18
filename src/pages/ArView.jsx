import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

const SCRIPT_DEFINITIONS = [
  {
    id: "aframe-script",
    src: "https://aframe.io/releases/1.2.0/aframe.min.js",
  },
  {
    id: "mindar-face-script",
    src: "https://cdn.jsdelivr.net/npm/mind-ar@1.1.4/dist/mindar-face-aframe.prod.js",
  },
  {
    id: "mindar-image-script",
    src: "https://cdn.jsdelivr.net/npm/mind-ar@1.1.4/dist/mindar-image-aframe.prod.js",
  },
];

const MARKER_EXTENSIONS = ["png", "jpg", "jpeg", "webp"];

function loadScript({ id, src }) {
  return new Promise((resolve, reject) => {
    const existing = document.getElementById(id);

    if (existing) {
      if (existing.getAttribute("data-loaded") === "true") {
        resolve();
        return;
      }

      existing.addEventListener("load", resolve, { once: true });
      existing.addEventListener("error", () => reject(new Error(`Failed to load script ${src}`)), {
        once: true,
      });
      return;
    }

    const script = document.createElement("script");
    script.async = true;
    script.id = id;
    script.src = src;
    script.addEventListener("load", () => {
      script.setAttribute("data-loaded", "true");
      resolve();
    });
    script.addEventListener("error", () => {
      reject(new Error(`Failed to load script ${src}`));
    });
    document.head.appendChild(script);
  });
}

async function assetExists(url) {
  try {
    const response = await fetch(url, { method: "HEAD" });

    if (response.ok) {
      return true;
    }
  } catch (error) {
    console.warn(`Failed to verify asset ${url}`, error);
  }

  return false;
}

function ArView() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [scriptsReady, setScriptsReady] = useState(false);
  const [scriptError, setScriptError] = useState(null);
  const [targetSrc, setTargetSrc] = useState("");
  const [modelSrc, setModelSrc] = useState("");
  const [markerImage, setMarkerImage] = useState("");
  const [assetError, setAssetError] = useState(null);

  const basePath = useMemo(() => `/assets/works/${id ?? ""}`.replace(/\/$/, ""), [id]);

  useEffect(() => {
    let cancelled = false;

    async function prepareScripts() {
      try {
        await Promise.all(SCRIPT_DEFINITIONS.map((script) => loadScript(script)));

        if (!cancelled) {
          setScriptsReady(true);
        }
      } catch (error) {
        console.error(error);

        if (!cancelled) {
          setScriptError(error);
        }
      }
    }

    prepareScripts();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!id) {
      setAssetError("Идентификатор работы не указан.");
      return;
    }

    let cancelled = false;

    async function resolveAssets() {
      const targetCandidate = `${basePath}/targets.mind`;
      const modelCandidates = [
        `${basePath}/model.glb`,
        `${basePath}/model.gltf`,
      ];

      const targetAvailable = await assetExists(targetCandidate);

      if (cancelled) {
        return;
      }

      if (!targetAvailable) {
        setAssetError(
          "Файл маркера (targets.mind) не найден. Добавьте его в public/assets/works/{id}.",
        );
        setTargetSrc("");
        return;
      }

      setTargetSrc(targetCandidate);

      let resolvedModel = "";
      // eslint-disable-next-line no-restricted-syntax
      for (const candidate of modelCandidates) {
        // eslint-disable-next-line no-await-in-loop
        const exists = await assetExists(candidate);

        if (cancelled) {
          return;
        }

        if (exists) {
          resolvedModel = candidate;
          break;
        }
      }

      if (!resolvedModel) {
        setAssetError(
          "3D-модель не найдена. Добавьте model.glb или model.gltf в public/assets/works/{id}.",
        );
        setModelSrc("");
        return;
      }

      setModelSrc(resolvedModel);
      setAssetError(null);

      for (const extension of MARKER_EXTENSIONS) {
        // eslint-disable-next-line no-await-in-loop
        const candidate = `${basePath}/marker.${extension}`;
        // eslint-disable-next-line no-await-in-loop
        const exists = await assetExists(candidate);

        if (cancelled) {
          return;
        }

        if (exists) {
          setMarkerImage(candidate);
          return;
        }
      }

      setMarkerImage("");
    }

    resolveAssets();

    return () => {
      cancelled = true;
    };
  }, [basePath, id]);

  useEffect(() => {
    if (!scriptsReady) {
      return undefined;
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [scriptsReady]);

  if (scriptError) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-black/95 p-6 text-center text-white">
        <p className="max-w-md text-lg font-semibold">Не удалось загрузить библиотеки для WebAR.</p>
        <p className="mt-4 max-w-md text-sm text-slate-200">{scriptError.message}</p>
        <button
          className="mt-8 rounded border border-white px-6 py-3 text-sm uppercase tracking-widest"
          type="button"
          onClick={() => navigate(-1)}
        >
          Вернуться назад
        </button>
      </div>
    );
  }

  if (!scriptsReady || !targetSrc || !modelSrc) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-black text-white">
        <div className="animate-pulse text-sm uppercase tracking-[0.4em] text-slate-200">Загрузка AR-сцены…</div>
        {assetError ? (
          <p className="mt-6 max-w-md text-center text-sm text-red-300">{assetError}</p>
        ) : (
          <p className="mt-6 max-w-md text-center text-xs text-slate-300">
            Убедитесь, что файлы targets.mind и модель размещены в каталоге public/assets/works/{id}.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="relative flex h-screen w-screen flex-col bg-black text-white">
      <header className="pointer-events-none absolute left-0 right-0 top-0 z-10 flex flex-col gap-4 bg-gradient-to-b from-black/80 to-black/20 p-6 text-center text-xs uppercase tracking-[0.35em]">
        <span className="text-sm font-semibold tracking-[0.4em]">Дополненная реальность</span>
        <span>Наведите камеру смартфона на маркер, чтобы увидеть работу.</span>
        {markerImage ? (
          <a
            className="pointer-events-auto self-center rounded border border-white/40 px-4 py-2 text-[0.65rem] tracking-[0.3em] text-white transition hover:border-white"
            href={markerImage}
            download
          >
            Скачать маркер
          </a>
        ) : (
          <span className="text-[0.65rem] tracking-[0.3em] text-slate-200">
            Добавьте marker.(png|jpg|jpeg|webp), чтобы предложить скачивание маркера.
          </span>
        )}
      </header>

      <button
        className="pointer-events-auto absolute left-4 top-4 z-20 rounded-full border border-white/60 bg-black/40 px-4 py-2 text-[0.65rem] uppercase tracking-[0.3em] text-white transition hover:border-white"
        type="button"
        onClick={() => navigate(-1)}
      >
        Назад
      </button>

      <div className="relative h-full w-full">
        <a-scene
          mindar-image={`imageTargetSrc: ${targetSrc};`} // eslint-disable-line react/no-unknown-property
          embedded // eslint-disable-line react/no-unknown-property
          color-space="sRGB" // eslint-disable-line react/no-unknown-property
          renderer="colorManagement: true;" // eslint-disable-line react/no-unknown-property
          vr-mode-ui="enabled: false" // eslint-disable-line react/no-unknown-property
          device-orientation-permission-ui="enabled: true" // eslint-disable-line react/no-unknown-property
        >
          <a-assets> {/* eslint-disable-line react/no-unknown-property */}
            <a-asset-item id="mindar-model" src={modelSrc} /> {/* eslint-disable-line react/no-unknown-property */}
          </a-assets>

          <a-camera
            position="0 0 0" // eslint-disable-line react/no-unknown-property
            look-controls="enabled: false" // eslint-disable-line react/no-unknown-property
          />

          <a-entity mindar-image-target="targetIndex: 0"> {/* eslint-disable-line react/no-unknown-property */}
            <a-gltf-model
              src="#mindar-model" // eslint-disable-line react/no-unknown-property
              position="0 0 0" // eslint-disable-line react/no-unknown-property
              scale="0.2 0.2 0.2" // eslint-disable-line react/no-unknown-property
            />
          </a-entity>
        </a-scene>
      </div>
    </div>
  );
}

export default ArView;
