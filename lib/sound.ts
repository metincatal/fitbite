// Hafif ses efektleri için ortak hook'lar.
//
// expo-audio v1+ AudioPlayer'ı useAudioPlayer ile yarattığımızda bileşen
// unmount olduğunda otomatik release olur. Aynı player instance'ını birden
// fazla kez çalmak için her tetiklemede seekTo(0) + play() yaparız; bu
// yöntem Android'de WAV/MP3 örnekleri için tek-shot SFX olarak yeterlidir.
import { useCallback, useRef } from 'react';
import { useAudioPlayer } from 'expo-audio';

const WATER_DROP_SOURCE = require('../assets/sounds/water-drop.wav');

/**
 * Su damlası SFX'i çalmak için kullanılır. Player ilk render'da yüklenir,
 * her çağrıda baştan oynatılır. Sessize alınmış / odak kaybetmiş cihazlarda
 * sessizce başarısız olur — kullanıcıya error fırlatmaz.
 */
export function useWaterDropSound(): () => void {
  const player = useAudioPlayer(WATER_DROP_SOURCE);
  const playerRef = useRef(player);
  playerRef.current = player;

  return useCallback(() => {
    const p = playerRef.current;
    if (!p) return;
    try {
      p.seekTo(0);
      p.play();
    } catch {
      // SFX başarısız olsa bile UI akışı bozulmasın
    }
  }, []);
}
