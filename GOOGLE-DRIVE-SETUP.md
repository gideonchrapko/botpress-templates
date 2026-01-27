# Google Drive Integration Setup

This guide explains how to set up the Google Drive section on your homepage.

## Overview

The Google Drive integration displays folders and files from your Google Drive on the homepage. Users can:
- See thumbnails of images
- See folder icons
- Click items to open them in Google Drive

## Setup Steps

### 1. Create a Google Cloud Project and Enable Drive API

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select existing)
3. Enable the **Google Drive API**:
   - Go to "APIs & Services" > "Library"
   - Search for "Google Drive API"
   - Click "Enable"

### 2. Create an API Key

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "API Key"
3. Copy the API key
4. (Optional) Restrict the API key:
   - Click "Restrict Key"
   - Under "API restrictions", select "Restrict key"
   - Choose "Google Drive API"
   - Save

### 3. Get Folder IDs from Google Drive

For each folder you want to display:

1. Open the folder in Google Drive
2. Look at the URL: `https://drive.google.com/drive/folders/FOLDER_ID_HERE`
3. Copy the `FOLDER_ID_HERE` part

**Example:**
- URL: `https://drive.google.com/drive/folders/1a2b3c4d5e6f7g8h9i0j`
- Folder ID: `1a2b3c4d5e6f7g8h9i0j`

### 4. Make Folders Accessible

**Important:** The folders must be accessible to anyone with the link:

1. Right-click the folder in Google Drive
2. Click "Share"
3. Change access to "Anyone with the link"
4. Set permission to "Viewer"
5. Click "Done"

### 5. Set Environment Variables

Add the API key to your `.env.local` (for local development) and Vercel environment variables (for production):

```bash
# Google Drive API Key
GOOGLE_DRIVE_API_KEY=your_api_key_here
```

**Example:**
```bash
GOOGLE_DRIVE_API_KEY=AIzaSyB1234567890abcdefghijklmnopqrstuv
```

### 6. Add Folder IDs to Config File

Edit `lib/drive-config.ts` and add your folder IDs to the array:

```typescript
export const GOOGLE_DRIVE_FOLDER_IDS = [
  "folder_id_1",
  "folder_id_2",
  "folder_id_3",
  // Add more folder IDs here
];
```

**Note:** Folder IDs are now stored in code (not env vars), so you can easily add/remove them and commit to git.

### 7. Deploy

After setting up:
1. Add folder IDs to `lib/drive-config.ts`
2. Set `GOOGLE_DRIVE_API_KEY` in Vercel environment variables
3. Commit and push your changes
4. Vercel will automatically redeploy
5. The Google Drive section will appear on your homepage

## How It Works

1. **API Route** (`/api/drive`):
   - Fetches files from specified Google Drive folders
   - Returns file metadata including thumbnails and links

2. **DriveGallery Component**:
   - Displays folders and files in a grid
   - Shows image thumbnails for images
   - Shows folder icons for folders
   - Links to Google Drive view URLs

3. **Home Page**:
   - Shows the Drive Gallery section when user is authenticated
   - Separate from the Templates section

## Supported File Types

- **Images**: Shows thumbnail previews
- **Folders**: Shows folder icon with color
- **Documents/Slides**: Shows file icon, links to Google Drive

## Troubleshooting

### "GOOGLE_DRIVE_API_KEY not configured"
- Make sure you've set the environment variable in Vercel
- Check that the variable name is exactly `GOOGLE_DRIVE_API_KEY`

### "No folder IDs configured"
- Make sure you've added folder IDs to `lib/drive-config.ts`
- Check that the array is not empty

### "Failed to fetch Google Drive items"
- Check that folders are shared with "Anyone with the link"
- Verify folder IDs are correct
- Check API key has Drive API enabled
- Check API key restrictions allow Drive API

### No items showing
- Verify folder IDs are correct
- Check folders contain files
- Check folders are shared publicly
- Check browser console for errors

## Security Notes

- API key is server-side only (not exposed to client)
- Folders must be shared publicly (or you'd need OAuth)
- For private folders, you'd need to implement OAuth flow (more complex)
