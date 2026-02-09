/**
 * Google Drive Configuration
 *
 * Default parent folder ID. The app lists all subfolders inside this folder.
 * Pass a different folderId to <DriveGallery folderId="..." /> to show subfolders of another folder.
 *
 * To get a folder ID:
 * 1. Open the folder in Google Drive
 * 2. Copy the ID from the URL: https://drive.google.com/drive/folders/FOLDER_ID_HERE
 *
 * Make sure the parent folder (and subfolders) are shared with
 * "Anyone with the link" (Viewer permission) if you want them viewable.
 */

/** Default folder used when DriveGallery is used without a folderId prop */
export const GOOGLE_DRIVE_PARENT_FOLDER_ID =
  "1i37oZTnfwETtrtnnd9U6BZQFW_rUvXc3";

/** Use these in page.tsx to show different sections, e.g. <DriveGallery folderId={DRIVE_FOLDER_IDS.branding} /> */
export const DRIVE_FOLDER_IDS = {
  default: "1i37oZTnfwETtrtnnd9U6BZQFW_rUvXc3",
  branding: "1-7nNQGvdatPZXUzx-htD6jtgMvxL0BKN",
  designResources: "1i37oZTnfwETtrtnnd9U6BZQFW_rUvXc3",
} as const;
