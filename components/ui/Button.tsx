import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  className = '', 
  icon,
  ...props 
}) => {
  const baseStyles = "px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 text-sm";
  
  const variants = {
    primary: "bg-brand-gold hover:bg-brand-dark text-white shadow-lg shadow-brand-gold/20 active:translate-y-0.5",
    secondary: "bg-white border border-brand-gold text-brand-gold hover:bg-brand-gold/5 shadow-sm",
    ghost: "text-brand-gold hover:bg-brand-gold/10",
    danger: "text-red-500 hover:bg-red-50 border border-transparent hover:border-red-200"
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${className} disabled:opacity-50 disabled:cursor-not-allowed`}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
};