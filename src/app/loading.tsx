import React from "react";
import { HashLoader } from "react-spinners";

export default function Loading() {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-[#ECECFC] to-[#FFFAF0] z-50">
      <HashLoader color="#424BE0" size={90} />
      <p className="mt-6 text-blue-600 text-lg font-medium animate-pulse">
        Please wait a moment...
      </p>
    </div>
  );
}
