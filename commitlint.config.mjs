const config = {
  extends: ["@commitlint/config-conventional"],
  rules: {
    // Los mensajes van en español; permitimos mayúsculas en nombres propios.
    "subject-case": [0],
    "body-max-line-length": [1, "always", 120],
  },
};

export default config;
