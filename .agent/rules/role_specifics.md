# Context-Specific Rules
## IF CHROME EXTENSION:
1.  **Manifest V3 Only:** `background.service_worker` required. No background pages.
2.  **State:** Use `chrome.storage.local`. No global vars.
3.  **NAS Sync:** Deployment must sync to NAS via `/deploy`.

## IF LOVABLE/SUPABASE:
1.  **Proxy Mode:** READ-ONLY on UI (`src/components`). Write prompts for Lovable.
2.  **Supabase Kill-Switch:** NO `db reset` or `db push`. Write migrations only.
