import { loadAppBaseEnv } from "./loadEnv.js";
import { resolveAppBase } from "./resolveAppBase.js";
export { loadAppBaseEnv } from "./loadEnv.js";
export { resolveAppBase, readAppNameFromRoot } from "./resolveAppBase.js";
export const appBase = (options) => {
    const envConfig = loadAppBaseEnv(options.envFile);
    const hostAppName = options.hostAppName ?? envConfig.hostAppName;
    return {
        name: "vite-plugin-app-base",
        config(_, { command }) {
            const appBaseUrl = resolveAppBase({
                appRoot: options.appRoot,
                command,
                devBase: options.devBase ?? "/",
                hostAppName
            });
            return { base: appBaseUrl };
        }
    };
};
