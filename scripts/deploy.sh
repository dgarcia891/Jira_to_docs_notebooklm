#!/bin/bash
# NAS Sync Script
echo "🚀 Syncing build to volume..."
rsync -avz dist/ /Volumes/Projects/Jira\ to\ NotebookLM\ Connector/dist/
echo "✅ Push to volume complete."
