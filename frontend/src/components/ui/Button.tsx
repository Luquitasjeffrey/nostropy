import * as React from "react"
import { cn } from "../../lib/utils"

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'ghost';
    size?: 'default' | 'sm' | 'lg' | 'icon';
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = 'primary', size = 'default', ...props }, ref) => {

        // Base styles + sizing + variants
        const baseStyles = "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-bold ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-95";

        const variants = {
            primary: "bg-primary text-[#0f212e] hover:bg-primaryHover shadow-[0_4px_0_0_#00c700] hover:shadow-[0_2px_0_0_#00c700] hover:translate-y-[2px]",
            success: "bg-green-500 text-white hover:bg-green-400 shadow-[0_4px_0_0_#16a34a] hover:shadow-[0_2px_0_0_#16a34a] hover:translate-y-[2px]",
            secondary: "bg-panel text-white hover:bg-gray-700",
            danger: "bg-danger text-white hover:bg-red-400 shadow-[0_4px_0_0_#dc2626] hover:shadow-[0_2px_0_0_#dc2626] hover:translate-y-[2px]",
            ghost: "hover:bg-panel hover:text-white text-gray-400",
        };

        const sizes = {
            default: "h-11 px-6 py-2",
            sm: "h-9 rounded-md px-3",
            lg: "h-14 rounded-md px-8 text-lg",
            icon: "h-10 w-10",
        };

        return (
            <button
                ref={ref}
                className={cn(baseStyles, variants[variant], sizes[size], className)}
                {...props}
            />
        )
    }
)
Button.displayName = "Button"

export { Button }
