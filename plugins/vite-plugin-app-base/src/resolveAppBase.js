import { readFileSync } from "node:fs";
import { resolve } from "node:path";
const readAppName = (appRoot) => {
    const packageJsonPath = resolve(appRoot, "package.json");
    const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));
    return packageJson.name;
};
export const resolveAppBase = (options) => {
    const { appRoot, command, devBase = "/", hostAppName = "main" } = options;
    const appName = readAppName(appRoot);
    if (command === "serve") {
        return devBase;
    }
    if (appName === hostAppName) {
        return "/";
    }
    return `/${appName}/`;
};
export const readAppNameFromRoot = readAppName;
