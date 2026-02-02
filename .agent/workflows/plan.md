---
name: plan
description: Architectural blueprint with Impact Report. READ ONLY.
---
1. Load Context
   node scripts/consult.cjs
   // turbo

2. Drift Check
   node scripts/drift_check.cjs
   // turbo

3. Blueprint Generation
   echo "📝 Drafting Implementation Plan..."
   echo "⚠️ CONSTRAINT: Output Markdown ONLY. Do not write files."
   // turbo

4. Stop
   echo "🛑 PLAN COMPLETE. Run /build to execute."
   // turbo
4. Data Tracer
   echo "🔎 Tracing Data Source..."
   echo "   - If this feature uses data, identify the DB Table and API Handler."
   // turbo
