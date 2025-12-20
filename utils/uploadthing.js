import {
  generateUploadButton,
  generateUploadDropzone,
} from "@uploadthing/react";

// Generate client components without importing the server router directly.
// The endpoint is passed as a prop at runtime, not at build time.
export const UploadButton = generateUploadButton();
export const UploadDropzone = generateUploadDropzone();
