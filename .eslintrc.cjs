// Minimal ESLint config (flat config would be nicer, but keep simple for demo).
module.exports = {
  root: true,
  env: { browser: true, es2022: true },
  extends: ["eslint:recommended"],
  parserOptions: { ecmaVersion: "latest", sourceType: "module" },
  settings: {},
  rules: {},
};

