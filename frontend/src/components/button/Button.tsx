import React, { type ButtonHTMLAttributes, type ReactNode } from 'react';
import Spinner from '../loaders/Spinner';


type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  rtl?: boolean;
  variant?: 'primary' | 'secondary';
  children: ReactNode;
  sx?: React.CSSProperties;
  sxclass?: string;
  loading?: boolean;
  icon?: ReactNode;
  sticky?: boolean;
  size?: "sm" | "md" | "lg";
  label?: string;
  onClick?: () => void;
  fullWidth?: boolean
};

const Button: React.FC<ButtonProps> = ({
  rtl,
  variant = 'primary',
  children,
  sx,
  sxclass = '',
  loading,
  icon,
  sticky,
  disabled,
  onClick,  
  fullWidth,
  size,
  ...rest
}) => {
          // ${variant === 'secondary' ? 'bg-[#6810F2] text-white hover:bg-[#5800D0]' : variant === "primary" ? 'bg-secondary-50 text-white hover:bg-secondary-60' : variant === "lightPrimary" ? "bg-[#EFD3D6] text-[#EE495D] hover:bg-[#D9AEB5]" : variant === 'lightSecondary' ? '!bg-success-0 !text-success-50 hover:!bg-success-100 hover:text-white' : variant === "success" ? 'bg-green-500 hover:bg-green-600' : variant === 'bluish' ? 'bg-[#3780F6] text-white hover:bg-[#1E60D8] ' : "bg-transparent text-white border border-white hover:bg-white/20 hover:border-white/20"}
// 
  return (
    <button
      disabled={disabled}
      data-disabled={disabled}
      data-sticky={sticky}
      data-variant={variant}
      data-rtl={rtl}
      onClick={onClick}
      className={` ${size === 'sm' ? 'h-[30px] rounded-[8px]' : size === 'md' ? ' h-[40px] rounded-[10px]'  : size === 'lg' ? ' h-[54px] rounded-[14px]' : ''}
        font-bold  text-[15px] inline-flex gap-2 items-center justify-center transition duration-150 
        ${variant === 'primary' ? 'bg-primary text-white hover:bg-[#5800D0]' : ''}
        ${rtl ? 'flex-row-reverse' : ''} 
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''} 
        ${sticky ? 'fixed bottom-4 left-8 right-8 z-10 md:sticky' : ''}
        ${fullWidth ? 'w-full': ''}
        ${sxclass}
      `}
      style={{ gap: icon ? 10 : 0, ...sx }}
      {...rest}
    >
      {icon && icon}
      {children}
      {loading && <Spinner sxclass="ml-1 animate-spin" />}
    </button>
  );
};

export default Button;