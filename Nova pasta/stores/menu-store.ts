"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { STORAGE_KEYS } from "@/lib/constants";

/** 1 = sidebar expandido, 2 = topo compacto (legado docs) */
export type MenuDeskType = "1" | "2";

type MenuState = {
  drawerOpen: boolean;
  setDrawerOpen: (v: boolean) => void;
  menuDeskType: MenuDeskType;
  setMenuDeskType: (t: MenuDeskType) => void;
};

export const useMenuStore = create<MenuState>()(
  persist(
    (set) => ({
      drawerOpen: false,
      setDrawerOpen: (drawerOpen) => set({ drawerOpen }),
      menuDeskType: "1",
      setMenuDeskType: (menuDeskType) => {
        set({ menuDeskType });
        try {
          localStorage.setItem(STORAGE_KEYS.tipoMenuDesk, menuDeskType);
        } catch {
          /* ignore */
        }
      },
    }),
    {
      name: "inevolving-menu",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ menuDeskType: s.menuDeskType }),
    }
  )
);
