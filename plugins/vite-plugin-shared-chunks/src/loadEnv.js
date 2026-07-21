import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
const pluginRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const parseEnvValue = (rawValue) => {
    let value = rawValue.trim();
    if (value.startsWith('"') && value.endsWith('"') || value.startsWith("'") && value.endsWith("'")) {
        value = value.slice(1, -1);
    }
    return value;
};
export const loadSharedChunksEnv = (envFilePath) => {
    const resolvedEnvPath = envFilePath ?? resolve(pluginRoot, ".env");
    const envMap = {};
    if (existsSync(resolvedEnvPath)) {
        const envText = readFileSync(resolvedEnvPath, "utf-8");
        envText.split(`
`).forEach((line) => {
            const trimmedLine = line.trim();
            if (!trimmedLine || trimmedLine.startsWith("#")) {
                return;
            }
            const splitIndex = trimmedLine.indexOf("=");
            if (splitIndex === -1) {
                return;
            }
            const key = trimmedLine.slice(0, splitIndex).trim();
            const value = trimmedLine.slice(splitIndex + 1).trim();
            envMap[key] = parseEnvValue(value);
        });
    }
    const packagesText = envMap.PACKAGES ?? "";
    const packages = packagesText.split(",").map((packageName) => packageName.trim()).filter(Boolean);
    const consumerAppsText = envMap.CONSUMER_APPS ?? "";
    const consumerApps = consumerAppsText.split(",").map((appName) => appName.trim()).filter(Boolean);
    return {
        packages,
        publicPath: envMap.PUBLIC_PATH || "/shared/",
        consumerApps
    };
};
export const createRulesFromPackages = (packages) => {
    return packages.map((packageName) => ({ packageName }));
};
