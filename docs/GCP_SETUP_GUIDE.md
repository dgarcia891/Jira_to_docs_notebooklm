# Google Cloud Console Setup Guide

This guide is intended for a browser agent or the developer to set up the necessary Google Cloud credentials for the **Jira to NotebookLM Connector**.

---

## Part 1: Project & APIs
1.  Navigate to [Google Cloud Console](https://console.cloud.google.com/).
2.  **Create a New Project**:
    - Click the project dropdown (top left).
    - Click **New Project**.
    - Project Name: `Jira NotebookLM Connector`
    - Click **Create**.
3.  **Enable APIs**:
    - Ensure the new project is selected.
    - Go to **APIs & Services > Library**.
    - Search for and **Enable** these two APIs:
        1.  `Google Docs API`
        2.  `Google Drive API`

---

## Part 2: OAuth Consent Screen
1.  Go to **APIs & Services > OAuth consent screen**.
2.  Choose **External** (unless you are in a Workspace and only want to use it yourself). Click **Create**.
3.  **App Information**:
    - App name: `Jira to NotebookLM`
    - User support email: (Select yours)
    - Developer contact info: (Select yours)
    - Click **Save and Continue**.
4.  **Scopes**:
    - Search and add:
        - `.../auth/documents`
        - `.../auth/drive.file`
        - `.../auth/userinfo.email`
    - Click **Update** then **Save and Continue**.
5.  **Test Users**:
    - Add your email address as a test user.
    - Click **Save and Continue**.

---

## Part 3: Credentials (Web Application)
> [!IMPORTANT]
> Since you are using **Comet**, we must use the **Web Application** client type instead of "Chrome Extension" to avoid redirect errors.

1.  Go to **APIs & Services > Credentials**.
2.  Click **Create Credentials > OAuth client ID**.
3.  Application type: **Web Application**.
4.  **Name**: `Comet Browser Client`.
5.  **Authorized redirect URIs**:
    - Click **Add URI**.
    - Paste exactly: `https://nnckaicmelmgbmcomckpgddaanaojbha.chromiumapp.org/`
    - Click **Add URI** again.
    - Paste exactly: `https://nnckaicmelmgbmcomckpgddaanaojbha.chromiumapp.org` (without the trailing slash)
6.  Click **Create**.
7.  **Final Step**: Copy the **Client ID** and provide it to the developer.

