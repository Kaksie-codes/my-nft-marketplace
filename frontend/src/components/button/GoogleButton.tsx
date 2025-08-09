import React, { type ButtonHTMLAttributes, type ReactNode } from 'react';

type GoogleButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
};

const GoogleButton: React.FC<GoogleButtonProps> = ({ children, ...props }) => {
  return (
    <button
      {...props}
      className="bg-white flex items-center justify-center h-[54px] w-full border border-[#f9f5fe] rounded-[14px]"
    >
      <img
        src="/google.png"
        height={30}
        width={30}
        alt="Google"
        style={{ objectFit: 'contain' }}
      />
      <span className="font-semibold text-[15px] leading-[120%] tracking-[-0.02em] ml-[11.44px] text-[#2b272f]">
        {children}
      </span>
    </button>
  );
};

export default GoogleButton;
