import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { resolve, join, dirname } from "node:path";
import { promises as fs } from "node:fs";
import { resolveVersion, injectVersion } from "./src/utils/version";

const version = resolveVersion();

let resolvedOutDir = "dist";
let resolvedBase = "./";

export default defineConfig(({ mode }) => ({
  appType: "mpa",
  base: "./",
  test: {
    globals: true,
    testTimeout: 15000,
    environment: "jsdom",
    setupFiles: ["./src/vitest.setup.ts"],
    css: true,
    clearMocks: true,
    restoreMocks: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      exclude: ["dist/**", "node_modules/**"],
    },
  },
  build: {
    target: "esnext",
    chunkSizeWarningLimit: 1500, // react-admin itself is 500kb, @mui 350kb, and other vendor libs are 730kb+ at the moment of writing
    sourcemap: mode === "development",
    rolldownOptions: {
      input: {
        main: resolve(__dirname, "src/entrypoints/index.html"),
        "auth-callback/index": resolve(__dirname, "src/entrypoints/auth-callback.html"),
      },
      output: {
        codeSplitting: {
          groups: [
            { name: "ra", test: /node_modules[\\/].*(react-admin|ra-)/, priority: 20 },
            { name: "mui", test: /node_modules[\\/]@mui/, priority: 15 },
            { name: "react", test: /node_modules[\\/](react|react-dom|react-is|scheduler)[\\/]/, priority: 10 },
            { name: "vendor", test: /node_modules/, priority: 5 },
          ],
        },
      },
    },
  },
  plugins: [
    {
      name: "entrypoint-output-paths",
      apply: "build",
      configResolved(config) {
        resolvedOutDir = config.build.outDir;
        resolvedBase = config.base || "./";
      },
      async closeBundle() {
        const outDir = resolvedOutDir;
        const sourceIndex = join(outDir, "src/entrypoints/index.html");
        const sourceAuth = join(outDir, "src/entrypoints/auth-callback.html");
        const targetIndex = join(outDir, "index.html");
        const targetAuth = join(outDir, "auth-callback/index.html");
        const normalizedBase =
          resolvedBase === "" || resolvedBase === "./"
            ? "./"
            : resolvedBase.endsWith("/")
              ? resolvedBase
              : `${resolvedBase}/`;
        const expectedAssetsPrefix = normalizedBase === "./" ? "./assets/" : `${normalizedBase}assets/`;

        const moveIfExists = async (from: string, to: string) => {
          try {
            await fs.access(from);
          } catch {
            return;
          }
          await fs.mkdir(dirname(to), { recursive: true });
          await fs.rm(to, { force: true });
          await fs.rename(from, to);
        };

        const rewriteAssets = async (filePath: string, assetsPrefix: string) => {
          try {
            const content = await fs.readFile(filePath, "utf8");
            const updated = content.replace(/(["'])(?:\.\.\/)+assets\//g, `$1${assetsPrefix}`);
            if (updated !== content) {
              await fs.writeFile(filePath, updated);
            }
          } catch {
            return;
          }
        };

        const assertAssetPrefix = async (filePath: string, assetsPrefix: string) => {
          const content = await fs.readFile(filePath, "utf8");
          const hasAssets = content.includes("assets/");
          if (!hasAssets) {
            return;
          }
          // Strip inline <style> blocks — CSS url() tokens use different quoting and are not HTML attribute paths
          const htmlOnly = content.replace(/<style>[\s\S]*?<\/style>/g, "");
          const invalidAssets = new RegExp(`["'](?!${assetsPrefix.replace(/\//g, "\\/")})[^"']*assets\\/`);
          if (invalidAssets.test(htmlOnly)) {
            throw new Error(`Unexpected assets path in ${filePath}`);
          }
        };

        await moveIfExists(sourceIndex, targetIndex);
        await moveIfExists(sourceAuth, targetAuth);
        if (normalizedBase === "./") {
          await rewriteAssets(targetIndex, "./assets/");
          await rewriteAssets(targetAuth, "./assets/");
        }
        await assertAssetPrefix(targetIndex, expectedAssetsPrefix);
        await assertAssetPrefix(targetAuth, expectedAssetsPrefix);
        await fs.rm(join(outDir, "src/entrypoints"), { recursive: true, force: true });
      },
    },
    {
      name: "auth-callback-dev-rewrite",
      configureServer(server) {
        server.middlewares.use((req, _res, next) => {
          if (!req.url) return next();
          const [path] = req.url.split("?");
          if (path === "/auth-callback" || path === "/auth-callback/" || path === "/auth-callback/index.html") {
            req.url = req.url.replace(path, "/src/entrypoints/auth-callback.html");
          } else if (path === "/" || path === "/index.html") {
            req.url = req.url.replace(path, "/src/entrypoints/index.html");
          }
          next();
        });
      },
    },
    react(),
    (() => {
      let fontsCss = "";
      return {
        name: "inline-fonts-css",
        apply: "build",
        generateBundle(_options, bundle) {
          for (const [fileName, chunk] of Object.entries(bundle)) {
            if (fileName.endsWith(".css") && chunk.type === "asset") {
              fontsCss = (chunk.source as string).replace(/url\(\.\//g, "url(./assets/");
              delete bundle[fileName];
            }
          }
        },
        transformIndexHtml: {
          order: "post",
          handler(html) {
            if (!fontsCss) return html;
            return html
              .replace(/<link[^>]+rel="stylesheet"[^>]*>\n?/g, "")
              .replace("</head>", `<style>${fontsCss}</style>\n</head>`);
          },
        },
      };
    })(),
    {
      name: "version-inject",
      transformIndexHtml(html) {
        return injectVersion(html, version);
      },
    },
    {
      name: "manifests",
      apply: "build",
      generateBundle() {
        const base = {
          name: "Ketesa",
          short_name: "Ketesa",
          version,
          description: "Ketesa is an admin UI for Matrix servers, formerly Synapse Admin.",
          lang: "en",
          dir: "auto",
          categories: ["productivity", "utilities"],
          orientation: "landscape",
          icons: [
            { src: "favicon.ico", sizes: "32x32", type: "image/x-icon" },
            { src: "images/logo.webp", sizes: "512x512", type: "image/webp", purpose: "any maskable" },
          ],
          start_url: ".",
          scope: ".",
          id: ".",
          display: "standalone",
        };
        this.emitFile({
          type: "asset",
          fileName: "manifest.json",
          source: JSON.stringify({ ...base, theme_color: "#F5F5F5", background_color: "#F5F5F5" }),
        });
        this.emitFile({
          type: "asset",
          fileName: "manifest-dark.json",
          source: JSON.stringify({ ...base, theme_color: "#0C1318", background_color: "#0C1318" }),
        });
      },
    },
  ],
  ssr: {
    noExternal: ["react-dropzone", "react-admin", "ra-ui-materialui"],
  },
}));
