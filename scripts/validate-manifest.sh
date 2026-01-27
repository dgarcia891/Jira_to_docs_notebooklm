#!/bin/bash
if [ ! -f "manifest.json" ]; then echo "❌ No manifest found"; exit 1; fi
# Check for V2 (Forbidden)
if grep -q '"manifest_version": 2' manifest.json; then
  echo "❌ CRITICAL: Manifest V2 detected. Upgrade to V3 immediately."
  exit 1
fi
echo "✅ Manifest V3 Verified."
