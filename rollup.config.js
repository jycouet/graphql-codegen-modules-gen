import shebang from "rollup-plugin-add-shebang";

export default {
  input: "./src/cli.js",
  output: {
    file: "./build/cli.cjs",
    format: "cjs",
  },
  plugins: [
    shebang({
      include: "./build/cli.cjs",
    }),
  ],
};
