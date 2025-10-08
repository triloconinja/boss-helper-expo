// src/context/MenuProvider.tsx
import React, { createContext, useState, useContext, ReactNode } from 'react';

type MenuContextType = {
  open: boolean;
  setOpen: (v: boolean) => void;
};

const MenuCtx = createContext<MenuContextType>({
  open: false,
  setOpen: () => {},
});

export const useMenu = () => useContext(MenuCtx);

export function MenuProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return <MenuCtx.Provider value={{ open, setOpen }}>{children}</MenuCtx.Provider>;
}
