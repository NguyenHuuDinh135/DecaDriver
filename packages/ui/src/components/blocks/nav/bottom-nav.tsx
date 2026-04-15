"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Camera, Plus, Shirt, User } from 'lucide-react';

export const BottomNav = () => {
  const pathname = usePathname();
  
  const getIcon = (name: string) => {
    switch (name) {
      case 'Home': return <Home size={24} />;
      case 'Camera': return <Camera size={24} />;
      case 'Plus': return <Plus size={28} />;
      case 'Shirt': return <Shirt size={24} />;
      case 'User': return <User size={24} />;
      default: return null;
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 h-20 bg-background/80 backdrop-blur-md border-t flex items-center justify-around pb-4 px-2 max-w-md mx-auto z-50">
      {/* Map qua MOCK_NAV_ITEMS để tạo các nút Link */}
    </div>
  );
};