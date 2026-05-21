/** @type {import('electron-builder').Configuration} */
module.exports = {
  appId: "br.com.psy-manager",
  productName: "Psy Manager",
  directories: {
    output: "dist-package",
  },
  files: ["dist/**/*"],
  extraResources: [
    {
      from: "../web/dist",
      to: "web-dist",
      filter: ["**/*"],
    },
  ],
  win: {
    target: "nsis",
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
  },
};
