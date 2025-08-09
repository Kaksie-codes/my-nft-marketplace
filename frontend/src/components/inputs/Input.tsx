import React, { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Eye, EyeSlash, InfoCircle } from "iconsax-react";
import toast from "react-hot-toast";
import { Link } from "react-router-dom";

interface InputProps {
  type?: "text" | "email" | "password" | "number" | "textarea";
  placeholder: string;
  value?: string | number;
  error?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  disabled?: boolean;
  required?: boolean;
  forgotpass?: boolean;
  additionalStyles?: string;
  maxlength?: number;
  bgColor?: string;
}

const Input: React.FC<InputProps> = ({
  type = "text",
  placeholder,
  value,
  error,
  onChange,
  disabled = false,
  required = false,
  forgotpass,
  additionalStyles = "",
  maxlength,
  bgColor
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const hasValue = !!value;  // Check if there's a value
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (maxlength && e.target.value.length === maxlength) {
      toast.error(`Maximum length of ${maxlength} characters reached!`);
    }

    if (onChange) {
      onChange(e);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (maxlength && value && value?.toString().length >= maxlength) {
      if (e.key !== "Backspace" && e.key !== "Delete" && e.key !== "ArrowLeft" && e.key !== "ArrowRight") {
        toast.error(`Maximum length of ${maxlength} characters reached!`);
        e.preventDefault(); // Prevent additional input beyond the limit
      }
    }
  };

  return (
    <motion.div className={`relative w-full `}>
      {/* Input Wrapper */}
      <div
        className={`relative w-full flex items-center overflow-hidden border rounded-lg transition-all ${
          error ? "border-red-500" : isFocused ? "border-indigo-500" : "border-[#9ca3af]"
        } ${disabled ? "opacity-50" : ""} ${additionalStyles} focus-within:${error ? "border-red-500" : "border-indigo-500"}`}
      >
        {/* Label */}
        <motion.span
          className={`absolute left-4 transition-all duration-200 font-bold pointer-events-none text-grey-100 ${
            isFocused || hasValue ? "top-2 text-[10px] text-gray-300" : "top-4 text-sm"
          }`}
        >
          {placeholder}
        </motion.span>

        {/* Input & Textarea */}
        {type === "textarea" ? (
          <motion.textarea
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
            className={`w-full pt-6 pb-2 px-3 h-[150px] ${bgColor ? bgColor : 'bg-[#321E53]'} rounded-lg outline-none text-white text-base resize-none `}
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            disabled={disabled}
            required={required}
            maxLength={maxlength}
          />
        ) : (
          <motion.input
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
            type={type === "password" && showPassword ? "text" : type}
            className={`w-full h-[54px] ${bgColor ? bgColor : 'bg-white'} text-black px-4 rounded-lg outline-none  ${isFocused || hasValue ? "pt-4" : ""}`}
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            disabled={disabled}
            required={required}
            maxLength={maxlength}
            autoComplete="new-password"
          />
        )}

        {/* Password Toggle */}
        {type === "password" && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute opacity-100 right-4 cursor-pointer border-none outline-none  text-primary z-50 hover:text-gray-300 transition"
          >
            {showPassword ? <Eye size={20} color="#9ca3af" /> : <EyeSlash size={20} color="#9ca3af" />}
          </button>
        )}
      </div>
      {forgotpass && (
        <Link to="/forgot-pwd" className="flex justify-end w-full text-sm text-red-500 hover:text-red-300">
          Forgot password?
        </Link>
      )}
      {/* Error Message */}
      <AnimatePresence>
        {error && (
          <motion.div
            className="text-red-500 text-xs mt-1 flex items-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <InfoCircle size={14} className="mr-2" color="#ef4444" /> {error}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default Input;