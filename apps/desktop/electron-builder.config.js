/** @type {import('electron-builder').Configuration} */

// electron-updater and its full transitive dependency tree,
// sourced from the bun workspace root node_modules to avoid
// electron-builder trying to invoke bun (which fails in CI).
const updaterModules = [
  "electron-updater",
  "builder-util-runtime",
  "debug",
  "ms",
  "sax",
  "fs-extra",
  "graceful-fs",
  "jsonfile",
  "universalify",
  "js-yaml",
  "argparse",
  "lazy-val",
  "lodash.escaperegexp",
  "lodash.isequal",
  "semver",
  "tiny-typed-emitter",
].map((name) => ({
  from: `../../node_modules/${name}`,
  to: `node_modules/${name}`,
}));

module.exports = {
  appId: "br.com.psy-manager",
  productName: "Psy Manager",
  directories: {
    output: "dist-package",
  },
  files: ["dist/**/*", ...updaterModules],
  extraResources: [
    {
      from: "../web/dist",
      to: "web-dist",
      filter: ["**/*", "!**/*.map"],
    },
  ],
  compression: "maximum",
  win: {
    target: "nsis",
    artifactName: "psy-manager-setup.exe",
    // icon: "assets/icon.ico", // adicionar ícone 256x256 ICO aqui
  },
  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
    shortcutName: "Psy Manager",
  },
  publish: {
    provider: "s3",
    bucket: "psy-manager-releases",
    region: "sa-east-1",
    path: "/",
    acl: null,
  },
};
