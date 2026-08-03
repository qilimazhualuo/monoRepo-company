import type { Plugin } from 'vite';

export type SharedChunksRole = 'producer' | 'consumer';

export interface SharedChunksOptions {
    role?: SharedChunksRole;
    envFile?: string;
    publicPath?: string;
    consumerSharedDir?: string;
    autoDiscover?: boolean;
    packages?: string[];
}

export declare const sharedChunks: (options?: SharedChunksOptions) => Plugin | Plugin[];

export declare const createSharedChunksPlugin: typeof sharedChunks;

export declare const createRulesFromPackages: (...args: any[]) => any;
export declare const loadSharedChunksEnv: (...args: any[]) => any;
export declare const collectAppRuntimePackages: (...args: any[]) => any;
export declare const createRulesFromDiscoveredPackages: (...args: any[]) => any;
export declare const dedupeScanRoots: (...args: any[]) => any;
export declare const discoverSharedPackages: (...args: any[]) => any;
export declare const resolveSharedRules: (...args: any[]) => any;
