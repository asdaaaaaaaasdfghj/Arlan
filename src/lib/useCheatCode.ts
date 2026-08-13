import { useEffect, useRef } from 'react';

const cheatCode = 'RTGBV456';

export function useCheatCode(onUnlock: () => void) {
  const bufferRef = useRef('');

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key.length !== 1) {
        return;
      }

      bufferRef.current = `${bufferRef.current}${event.key.toUpperCase()}`.slice(-cheatCode.length);
      if (bufferRef.current === cheatCode) {
        bufferRef.current = '';
        onUnlock();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onUnlock]);
}
