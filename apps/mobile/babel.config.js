const path = require("node:path");

module.exports = function (api) {
  api.cache(true);

  const inlineExpoRouterEnv = (babelApi) => ({
    name: "inline-expo-router-env",
    visitor: {
      MemberExpression(memberPath, state) {
        if (!memberPath.get("object").matchesPattern("process.env")) {
          return;
        }

        const property = memberPath.node.property;
        const { types: t } = babelApi;

        if (!memberPath.node.computed && property.name === "EXPO_ROUTER_APP_ROOT") {
          const caller = state.file.opts.caller ?? {};
          const projectRoot = caller.projectRoot || process.env.EXPO_PROJECT_ROOT || __dirname;
          const routerRoot = caller.routerRoot || "src/app";
          const absoluteAppRoot = path.isAbsolute(routerRoot)
            ? routerRoot
            : path.join(projectRoot, routerRoot);
          const filename =
            state.filename ||
            state.file.opts.filename ||
            path.join(__dirname, "node_modules/expo-router/_ctx.js");
          const relativeAppRoot = path
            .relative(path.dirname(filename), absoluteAppRoot)
            .replace(/\\/g, "/");

          memberPath.replaceWith(t.stringLiteral(relativeAppRoot));
        }

        if (
          !memberPath.node.computed &&
          property.name === "EXPO_ROUTER_IMPORT_MODE"
        ) {
          const caller = state.file.opts.caller ?? {};
          memberPath.replaceWith(t.stringLiteral(caller.asyncRoutes ? "lazy" : "sync"));
        }
      },
    },
  });

  return {
    presets: ["babel-preset-expo"],
    plugins: [inlineExpoRouterEnv, "react-native-reanimated/plugin"],
  };
};
