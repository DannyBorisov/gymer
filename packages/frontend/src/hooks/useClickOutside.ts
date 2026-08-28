import { useEffect } from "react";

const useClickOutside = (el: HTMLElement | null, callback: Function) => {
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (el && !el.contains(event.target as Node)) {
        callback(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
};

export default useClickOutside;
