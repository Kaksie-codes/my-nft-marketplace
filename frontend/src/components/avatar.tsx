"use client";

import React, { useState, useEffect, type ElementType } from "react";
import { Notification } from "iconsax-react";
import { generateColor, generateInitials } from "../utils";


interface AvatarProps {
  image?: string;
  name?: string;
  className?: string;
  size?: "xs" | "ms" | "sm" | "md" | "ml" | "lg" | "2xl" | "3xl" | number;
  icon?: ElementType;
  square?: boolean;
  loading?: boolean;
  onClick?: () => void;
  borderColor?: string;
}

const Avatar: React.FC<AvatarProps> = ({
  image,
  name = "",
  className = "",
  size = "sm",
  icon,
  square = false,
  loading = false,
  onClick,
  borderColor
}) => {
  const [error, setError] = useState(false);

  // const splitName = name.split(" ");
  // const initials = `${splitName[0]?.charAt(0) || ""}${splitName[1]?.charAt(0) || ""}`;

  const sizes: Record<string, string> = {
    xs: "h-[20px] w-[20px] font-light text-[8px]",
    ms: "h-[26px] w-[26px] font-light text-[12px] border-white border-[4px]",
    sm: "h-[32px] w-[32px] font-bold border-2 border-white border-[4px]",
    md: "h-[40px] w-[40px] text-[14px] border-4 border-white border-[4px]",
    ml: "h-[43px] w-[43px] text-[16px] font-sfSemibold border-white border-[4px]",
    lg: "h-[58px] w-[58px] text-[20px] !font-sfSemibold border-white text-white",
    "2xl": "h-[58px] w-[58px]  md:h-[80px] md:w-[80px] text-[30px] !font-sfSemibold !border-main border-[4px]",
    "3xl": "h-[80px] w-[80px] md:h-[110px] md:w-[110px] text-[40px] !font-sfSemibold !border-main border-[6px]",
  };

  // Calculate custom size styles if size is a number
  const customSizeStyles = typeof size === 'number' 
    ? `h-[${size}px] w-[${size}px] text-[${Math.max(8, size * 0.25)}px]`
    : '';

  useEffect(() => {
    setError(false);
  }, []);

  return (
    <div
      onClick={onClick}
      style={
        !icon
          ? {
              background: loading ? "" : image && !error ? "#ffffff10" : generateColor(name),
            }
          : {}
      }
      className={`${typeof size === 'number' ? customSizeStyles : sizes[size]} ${borderColor ? borderColor : 'border-white'}  text-white relative tracking-n-2 overflow-hidden text-[12px] uppercase flex items-center justify-center  shrink-0 ${
        square ? "rounded-[10px]" : "rounded-full"
      } ${className}`}
    >
      {loading && <div className="absolute inset-0 bg-white/50 animate-pulse" />}

      {icon ? (
        <div className="absolute inset-0 flex items-center justify-center bg-[#FFEAEA] text-u-red">
          {React.createElement(icon || Notification, {
            variant: "Bulk",
            size: 18,
          })}
        </div>
      ) : (
        <>
          {image && !loading && !error ? (            
            <img
                src={image}
                alt={name || "avatar"}
                className="absolute inset-0 w-full h-full object-cover"
                onError={() => setError(true)}
            />
          ) : (
            <span className="tracking-n-3">{generateInitials(name)}</span>
          )}
        </>
      )}
    </div>
  );
};

export default Avatar;
