/** Default folder used when DriveGallery is used without a folderId prop */
export const GOOGLE_DRIVE_PARENT_FOLDER_ID =
  "1i37oZTnfwETtrtnnd9U6BZQFW_rUvXc3";

/** Use these in page.tsx to show different sections, e.g. <DriveGallery folderId={DRIVE_FOLDER_IDS.branding} /> */
export const DRIVE_FOLDER_IDS = {
  default: "1i37oZTnfwETtrtnnd9U6BZQFW_rUvXc3",
  branding: "1-7nNQGvdatPZXUzx-htD6jtgMvxL0BKN",
  designResources: "1i37oZTnfwETtrtnnd9U6BZQFW_rUvXc3",
} as const;
