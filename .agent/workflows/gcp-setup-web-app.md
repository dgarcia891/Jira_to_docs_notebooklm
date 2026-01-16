---
description: How to set up Google Cloud Web Application credentials for the Comet browser
---

# Workflow: GCP Setup for Comet (Web Application)

This workflow is designed for an AI agent to configure OAuth credentials in the Google Cloud Console specifically for the Jira to NotebookLM Connector in the Comet browser.

## Steps

1.  **Navigate directly to Credentials**:
    - Open `https://console.cloud.google.com/apis/credentials`.
    - If prompted to select a project, search for and select **"Jira NotebookLM Connector"**.

2.  **Create OAuth Client**:
    - Click the **"+ Create Credentials"** button at the top.
    - Select **"OAuth client ID"**.

3.  **Configure Application Type**:
    - Set the **"Application type"** dropdown to **"Web Application"**.
    - Set the **"Name"** field to **"Comet Browser Client"**.

4.  **Add Authorized Redirect URIs**:
    - Scroll down to the **"Authorized redirect URIs"** section.
    - Click **"ADD URI"**.
    - Enter: `https://nnckaicmelmgbmcomckpgddaanaojbha.chromiumapp.org/`
    - Click **"ADD URI"** again (important for strict matching).
    - Enter: `https://nnckaicmelmgbmcomckpgddaanaojbha.chromiumapp.org` (without the trailing slash).

5.  **Finalize and Extract**:
    - Click the **"CREATE"** button.
    - An "OAuth client created" dialog will appear.
    - **Copy the "Your Client ID"** value (e.g., `342225464153...apps.googleusercontent.com`).
    - Output this Client ID as the final result.
