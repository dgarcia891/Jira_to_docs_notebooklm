name: build
description: Builds the extension, runs mocks, and bundles for store.
steps:
  - name: Test Gate
    command: npm run test:unit # Must use jest-chrome [Source 647]
  - name: Clean & Bundle
    command: rm -rf dist/ && npm run build
  - name: Pack
    command: zip -r extension.zip dist/ manifest.json icons/
