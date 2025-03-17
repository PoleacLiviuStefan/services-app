// Tooltip.tsx
import React, { ReactNode } from "react";

interface TooltipProps {
  content: ReactNode; // Conținutul tooltip-ului
  children: ReactNode; // Elementul care declanșează tooltip-ul (ex: un buton)
  position?: "top" | "bottom" | "left" | "right"; // Poziționare, default este "top"
}

const Tooltip: React.FC<TooltipProps> = ({ content, children, position = "top" }) => {
  // Stabilim clasele Tailwind pentru poziționarea tooltip-ului
  let positionClasses = "";
  switch (position) {
    case "top":
      positionClasses = "bottom-full left-1/2 transform -translate-x-1/2 mb-2";
      break;
    case "bottom":
      positionClasses = "top-full left-1/2 transform -translate-x-1/2 mt-2";
      break;
    case "left":
      positionClasses = "right-full top-1/2 transform -translate-y-1/2 mr-2";
      break;
    case "right":
      positionClasses = "left-full top-1/2 transform -translate-y-1/2 ml-2";
      break;
    default:
      positionClasses = "bottom-full left-1/2 transform -translate-x-1/2 mb-2";
  }

  return (
    <div className="relative inline-block group">
      {children}
      <div
        className={`absolute ${positionClasses} bg-gray-800 text-white text-sm rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none`}
      >
        {content}
      </div>
    </div>
  );
};

export default Tooltip;
