import React from 'react';
import { Menu, Bell } from 'lucide-react';

interface HeaderProps {
  onMenuClick?: () => void;
  onNotificationClick?: () => void;
  notificationCount: number;
}

export const Header: React.FC<HeaderProps> = ({ onMenuClick, onNotificationClick, notificationCount }) => {
  return (
    <header className="flex items-center justify-between px-6 py-6 bg-brand-onyx sticky top-0 z-20 border-b border-white/5 backdrop-blur-md bg-opacity-90">

      {/* Brand Identity - Minimalist Geometric */}
      <div className="flex items-center gap-2 sm:gap-3">
        <img src="/logo-barbearia2.png" alt="Barbearia Robson" className="w-12 h-12 sm:w-16 sm:h-16 object-contain" />
        <div className="flex flex-col justify-center -mt-1">
          <h1 className="font-display font-black text-sm sm:text-xl tracking-tighter uppercase text-white font-stretch-expanded leading-none">
            Barbearia<span className="text-brand-gold">App</span>
          </h1>
          <p className="text-[8px] sm:text-[10px] text-brand-muted tracking-[0.2em] uppercase font-bold leading-none mt-0.5 sm:mt-1">Gestão</p>
        </div>
      </div>

      {/* Navigation Actions */}
      <div className="flex gap-4">
        <button
          onClick={onMenuClick} // reused for notifications if we want or just separate?
        // The user asked for a Notification Icon. Let's add it separately.
        >
          {/* Original Menu Button */}
        </button>

        {/* Notification Bell */}
        <button onClick={onNotificationClick} className="relative group cursor-pointer w-10 h-10 rounded-lg bg-brand-concrete flex items-center justify-center border border-white/5 group-hover:border-brand-gold/50 transition-colors">
          <Bell className={`w-5 h-5 transition-colors ${notificationCount > 0 ? 'text-brand-gold animate-pulse' : 'text-brand-text group-hover:text-brand-gold'}`} />
          {notificationCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-[10px] font-bold text-white border border-brand-onyx">
              {notificationCount}
            </span>
          )}
        </button>

        <button onClick={onMenuClick} className="relative group cursor-pointer w-10 h-10 rounded-lg bg-brand-concrete flex items-center justify-center border border-white/5 group-hover:border-brand-gold/50 transition-colors">
          <Menu className="w-5 h-5 text-brand-text group-hover:text-brand-gold transition-colors" />
        </button>
      </div>
    </header >
  );
};