/**
 * Enregistre l'audio du micro et retourne le blob
 */
export async function recordAudio(): Promise<Blob> {
  return new Promise((resolve, reject) => {
    let mediaRecorder: MediaRecorder;
    let audioChunks: Blob[] = [];

    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => {
        mediaRecorder = new MediaRecorder(stream);
        
        mediaRecorder.ondataavailable = (event) => {
          audioChunks.push(event.data);
        };

        mediaRecorder.onstop = () => {
          const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
          stream.getTracks().forEach(track => track.stop());
          resolve(audioBlob);
        };

        mediaRecorder.start();

        // Arrêt automatique après 30s max
        setTimeout(() => {
          if (mediaRecorder.state === 'recording') {
            mediaRecorder.stop();
          }
        }, 30000);

        // Exposer le stop pour le contrôle externe
        (window as any).__stopRecording = () => {
          if (mediaRecorder.state === 'recording') {
            mediaRecorder.stop();
          }
        };
      })
      .catch(reject);
  });
}

/**
 * Transcrit l'audio en texte via Whisper
 */
export async function transcribeAudio(audioBlob: Blob): Promise<string> {
  const formData = new FormData();
  formData.append('audio', audioBlob, 'recording.webm');

  const response = await fetch('/api/audio/transcribe', {
    method: 'POST',
    body: formData
  });

  if (!response.ok) {
    throw new Error('Erreur transcription');
  }

  const data = await response.json();
  return data.text;
}

/**
 * Convertit le texte en audio via TTS
 */
export async function textToSpeech(text: string): Promise<Blob> {
  const response = await fetch('/api/audio/tts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text })
  });

  if (!response.ok) {
    throw new Error('Erreur TTS');
  }

  return await response.blob();
}

/**
 * Joue un blob audio
 * @param audioBlob - Le blob audio à jouer
 * @param audioRef - Référence optionnelle pour contrôler l'audio (pause, stop)
 */
export function playAudio(
  audioBlob: Blob, 
  audioRef?: { current: HTMLAudioElement | null }
): Promise<void> {
  return new Promise((resolve, reject) => {
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);
    
    // Stocker la ref si fournie
    if (audioRef) {
      audioRef.current = audio;
    }
    
    audio.onended = () => {
      URL.revokeObjectURL(audioUrl);
      if (audioRef) {
        audioRef.current = null;
      }
      resolve();
    };
    
    audio.onerror = () => {
      URL.revokeObjectURL(audioUrl);
      if (audioRef) {
        audioRef.current = null;
      }
      reject(new Error('Erreur lecture audio'));
    };
    
    audio.play().catch(reject);
  });
}
