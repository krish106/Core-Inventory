import { Sun, Moon } from 'lucide-react';
import useDarkMode from '../hooks/useDarkMode';

export default function DarkModeToggle() {
  const { isDark, toggleDark } = useDarkMode();
  return (
    <button onClick={toggleDark} title={isDark ? 'Light Mode' : 'Dark Mode'}
      className="p-2 rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all relative overflow-hidden">
      <div className="transition-transform duration-500" style={{ transform: isDark ? 'rotate(360deg)' : 'rotate(0deg)' }}>
        {isDark ? <Sun size={20} className="text-yellow-400" /> : <Moon size={20} />}
      </div>
    </button>
  );
}
