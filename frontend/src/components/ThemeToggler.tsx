import { Moon, Sun } from "lucide-react"
import { useTheme } from "../context/ThemeProvider";


const ThemeToggler = () => {
      const { theme, toggleTheme } = useTheme();
  return (
    <button
        onClick={toggleTheme}
        className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
    >
        {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
    </button>
  )
}

export default ThemeToggler
