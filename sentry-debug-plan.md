# Sentry Source Map Debugging Plan

## Problem Statement
The application is experiencing issues with Sentry source map integration. When errors occur, Sentry displays minified code instead of the original source code, making debugging difficult.

## Current Setup
- **Framework**: Vite with React and TypeScript
- **Bundler**: Vite with manual chunk configuration
- **Sentry Integration**: @sentry/vite-plugin v3.4.0
- **Release Version**: v1.0.2 (from package.json)
- **Testing Method**: Local build and serve with test error button

## Source Map Validation Checklist

### 1. JavaScript Files Must Have sourceMappingURL Comments ❌ PARTIAL

```bash
tail -n 1 dist/assets/*.js | grep sourceMappingURL
//# sourceMappingURL=cytoscape.esm-64523c69.js.map
//# sourceMappingURL=init-357ff1a4.js.map
//# sourceMappingURL=ordinal-e218aa0e.js.map
```

**Status**: ❌ PARTIAL - Only some JS files have sourceMappingURL comments. Critically, the main index-*.js files are missing these comments.

### 2. Source Maps Must Contain Your Source Files ✅ PASS

```bash
grep -a "src/components/" dist/assets/*.map | head -1
dist/assets/DiagramSource-f0f71e13.js.map:{"version":3,"file":"DiagramSource-f0f71e13.js","sources":["../../src/components/Chat/ChatContent/Message/MermaidComponent/DiagramSource.tsx"],"sourcesContent":["import React from 'react';\n\ninterface DiagramSourceProps {\n  content: string;\n}\n\nconst DiagramSource: React.FC<DiagramSourceProps> = ({ content }) => (\n  <details className=\"mt-2\">\n    <summary className=\"text-sm text-gray-500 cursor-pointer hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200\">\n      Show diagram source\n    </summary>\n    <pre className=\"mt-2 text-sm bg-gray-50 dark:bg-gray-800 p-2 rounded\">\n      <code>{content}</code>\n    </pre>\n  </details>\n);\n\nexport default DiagramSource;\n"],"names":["DiagramSource","content","jsxs","className","children","jsx"],"mappings":";wZAMM,MAAAA,EAA8C,EAAGC,aACpDC,EAAAA,KAAA,UAAA,CAAQC,UAAU,OACjBC,SAAA,CAACC,EAAAA,IAAA,UAAA,CAAQF,UAAU,uGAAuGC,SAE1H,8BACC,MAAI,CAAAD,UAAU,uDACbC,SAACC,MAAA,OAAA,CAAMD"}
```

**Status**: ✅ PASS - Source maps contain references to your source files.

### 3. Source Maps Must Include Source Content ✅ PASS

From the previous output, we can see:
```
"sourcesContent":["import React from 'react';\n\ninterface DiagramSourceProps {\n  content: string;\n}\n\nconst DiagramSource: React.FC<DiagramSourceProps> = ({ content }) => (\n  <details className=\"mt-2\">\n    <summary className=\"text-sm text-gray-500 cursor-pointer hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200\">\n      Show diagram source\n    </summary>\n    <pre className=\"mt-2 text-sm bg-gray-50 dark:bg-gray-800 p-2 rounded\">\n      <code>{content}</code>\n    </pre>\n  </details>\n);\n\nexport default DiagramSource;\n"]
```

**Status**: ✅ PASS - Source maps include the original source content.

### 4. Source Maps Must Have Correct Mapping Data ✅ PASS

From the previous output, we can see:
```
"mappings":";wZAMM,MAAAA,EAA8C,EAAGC,aACpDC,EAAAA,KAAA,UAAA,CAAQC,UAAU,OACjBC,SAAA,CAACC,EAAAA,IAAA,UAAA,CAAQF,UAAU,uGAAuGC,SAE1H,8BACC,MAAI,CAAAD,UAAU,uDACbC,SAACC,MAAA,OAAA,CAAMD"
```

**Status**: ✅ PASS - Source maps contain mapping data.

### 5. Release Version Must Be Consistent ✅ PASS

From config files:
- In vite.config.prod.ts: `name: process.env.VITE_APP_VERSION || v${process.env.npm_package_version}`
- In App.tsx: `release: process.env.VITE_APP_VERSION || v${process.env.npm_package_version}`

**Status**: ✅ PASS - Release versions are consistent.

### 6. URL Prefix Must Match Asset Serving Path ❓ NEEDS VERIFICATION

From vite.config.prod.ts:
```
urlPrefix: '~/assets'
```

**Status**: ❓ NEEDS VERIFICATION - We need to confirm this matches how assets are served in production.

### 7. Debug IDs Should Be Present ❓ NEEDS VERIFICATION

We haven't checked for Sentry debug IDs yet.

**Status**: ❓ NEEDS VERIFICATION - Need to check for debug ID injection.

### 8. Source Maps Should Be Valid JSON ❓ NEEDS VERIFICATION

We haven't validated the JSON structure of all maps.

**Status**: ❓ NEEDS VERIFICATION - Need to check JSON validity.

### 9. Source Maps Should Be Uploaded Successfully ❓ NEEDS VERIFICATION

We need to check build logs for successful uploads.

**Status**: ❓ NEEDS VERIFICATION - Need to check upload logs.

### 10. Test with a Real Error ❓ NEEDS VERIFICATION

This requires testing in the actual application.

**Status**: ❓ NEEDS VERIFICATION - Need to test with a real error.

## Debugging Decision Tree

### Step 1: Verify Source Map Generation
- [x] Run: `node scripts/validate-sourcemaps.js dist/assets/[filename].js.map 1 1`
- [x] Check if output shows original source file paths and content
  - [x] **YES**: Source maps contain original code → Proceed to Step 2
  - [ ] **NO**: Source maps are incomplete → Fix source map generation in vite.config.prod.ts

### Step 2: Verify Release Version Consistency
- [x] Check build logs for release version used during upload
- [x] Verify the value in Sentry.init() matches: `process.env.VITE_APP_VERSION || v${process.env.npm_package_version}`
- [ ] Confirm this matches the release version shown in Sentry dashboard
  - [ ] **YES**: Release versions are consistent → Proceed to Step 3
  - [ ] **NO**: Release versions mismatch → Fix by ensuring consistent release naming

### Step 3: Test URL Prefix Configuration
- [ ] Try different URL prefix configurations:
  ```javascript
  // Option 1: No prefix (if assets are at root)
  urlPrefix: '~/'
  
  // Option 2: Just the assets directory
  urlPrefix: '~/assets'
  
  // Option 3: Full URL path
  urlPrefix: 'https://your-app-domain.com/assets'
  ```
- [ ] After each change, rebuild and test with error button

### Step 4: Check for Processing Delays
- [ ] Wait 5-10 minutes after uploading source maps
- [ ] Trigger test error again
- [ ] Check Sentry dashboard for proper source mapping

### Step 5: Examine Error Details in Sentry
- [ ] Look at specific error details in Sentry dashboard
- [ ] Check if filenames are correct but line numbers are wrong

### Step 6: Add Enhanced Debug Logging
- [ ] Add verbose logging to Sentry initialization

### Step 7: Check Sentry's Processing Issues Page
- [ ] Go to Sentry dashboard → Settings → Processing Issues
- [ ] Look for any reported issues with your source maps

### Step 8: Try Alternative Source Map Upload Method
- [ ] Use Sentry CLI directly to upload source maps

### Step 9: Validate Source Maps with External Tools
- [ ] Use source-map-explorer to analyze source maps

## Critical Issue: Missing sourceMappingURL in Main Files

The most critical issue is that the main JavaScript files (index-*.js) are missing the sourceMappingURL comments. This will prevent Sentry from finding the source maps for these files, which likely contain most of the application code.

### Next Steps

1. Update Vite configuration to force inclusion of sourceMappingURL comments:

```typescript
build: {
  // Try explicit 'inline' to force inclusion of sourceMappingURL
  sourcemap: 'inline',
  rollupOptions: {
    output: {
      sourcemapExcludeSources: false,
      // Other output options...
    }
  },
  // Other build options...
}
```

2. After rebuilding, check again for sourceMappingURL comments in index-*.js files.

3. If this doesn't work, consider a post-build script to manually inject these comments.

## Progress Log

| Date | Step | Result | Notes |
|------|------|--------|-------|
| Today | Step 1: Verify Source Map Generation | ❌ PARTIAL | Source maps are generated with correct content, but main index-*.js files are missing sourceMappingURL comments. This is likely the root cause of Sentry source mapping issues. |


