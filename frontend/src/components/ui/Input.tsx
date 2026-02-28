import * as React from "react"
import { cn } from "../../lib/utils"

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    icon?: React.ReactNode;
    rightAction?: React.ReactNode;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ className, type, label, icon, rightAction, ...props }, ref) => {
        return (
            <div className="w-full">
                {label && (
                    <label className="text-xs font-semibold text-gray-400 mb-1 block">
                        {label}
                    </label>
                )}
                <div className="relative flex items-center bg-[#0f212e] rounded-md border-2 border-[#2a3f54] focus-within:border-gray-500 transition-colors">
                    {icon && (
                        <div className="pl-3 text-gray-400 flex items-center justify-center">
                            {icon}
                        </div>
                    )}
                    <input
                        type={type}
                        className={cn(
                            "flex h-11 w-full bg-transparent px-3 py-2 text-sm text-white font-bold ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-600 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
                            className
                        )}
                        ref={ref}
                        {...props}
                    />
                    {rightAction && (
                        <div className="pr-1 flex items-center">
                            {rightAction}
                        </div>
                    )}
                </div>
            </div>
        )
    }
)
Input.displayName = "Input"

export { Input }
