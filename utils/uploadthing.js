"use client";

import React from "react";

// Lightweight client-side fallback for UploadThing during build/without the package.
// This avoids importing server-only code into client bundles.
export function UploadButton({ endpoint, onClientUploadComplete, onUploadError }) {
  const handleChange = async (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    try {
      const file = { name: f.name, url: "", key: "" };
      if (onClientUploadComplete) await onClientUploadComplete([file]);
    } catch (err) {
      if (onUploadError) onUploadError(err);
    }
  };

  return (
    React.createElement("div", null,
      React.createElement("input", { type: "file", onChange: handleChange })
    )
  );
}

export const UploadDropzone = UploadButton;
