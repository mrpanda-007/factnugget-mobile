/// <reference types="nativewind/types" />

// Metro handles the actual .css import at build time (see metro.config.js);
// this just satisfies the TypeScript compiler.
declare module '*.css';
