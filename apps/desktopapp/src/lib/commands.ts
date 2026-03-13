import { invoke } from "@tauri-apps/api/core";

export type DesktopShellStatus = {
  productName: string;
  mode: string;
  storageStrategy: string;
  syncStrategy: string;
  rustBoundary: string[];
  frontendBoundary: string[];
};

export const loadDesktopShellStatus = () => invoke<DesktopShellStatus>("load_shell_status");
