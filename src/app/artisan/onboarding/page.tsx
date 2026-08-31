'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';

type OnboardingStep = 'record' | 'processing' | 'review';

interface ExtractedProfile {
  name: string | null;
  location: string | null;
  district: string | null;
  state: string | null;
  craftType: string | null;
  experience: string | null;
  artisanStory: string | null;
}

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<OnboardingStep>('record');
  const [recording, setRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [profile, setProfile] = useState<ExtractedProfile>({
    name: null, location: null, district: null, state: null,
    craftType: null, experience: null, artisanStory: null,
  });
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [error, setError] = useState('');
  const [qrCode, setQrCode] = useState('');
  const [artisanId, setArtisanId] = useState('');
  const [language] = useState('en');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const speechRecognitionRef = useRef<unknown>(null);
  const liveTranscriptRef = useRef<string>('');

  // === Voice Recording ===
  const startRecording = useCallback(async () => {
    try {
      setError('');
      liveTranscriptRef.current = '';

      // Initialize Web Speech API for real-time live browser transcription
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-IN';

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        recognition.onresult = (event: any) => {
          let currentText = '';
          for (let i = 0; i < event.results.length; i++) {
            currentText += event.results[i][0].transcript + ' ';
          }
          liveTranscriptRef.current = currentText.trim();
        };

        recognition.start();
        speechRecognitionRef.current = recognition;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : 'audio/ogg',
      });

      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const audioBlob = new Blob(chunksRef.current, { type: mediaRecorder.mimeType });
        await processAudio(audioBlob);
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setRecording(true);
    } catch (err) {
      if (err instanceof Error && err.name === 'NotAllowedError') {
        setError('Microphone permission denied. Please allow microphone access in your browser settings.');
      } else {
        setError('Failed to start recording. Please check your microphone.');
      }
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (speechRecognitionRef.current) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (speechRecognitionRef.current as any).stop();
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  }, []);

  // === Process Audio (STT + AI Extraction) ===
  const processAudio = async (audioBlob: Blob) => {
    setStep('processing');
    setLoadingMessage('Transcribing your voice...');

    let finalTranscript = liveTranscriptRef.current;

    try {
      // Step 1: Try STT Server (Whisper API)
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');
      formData.append('language', language);
      formData.append('purpose', 'ARTISAN_ONBOARDING');

      const sttRes = await fetch('/api/stt/transcribe', {
        method: 'POST',
        body: formData,
      });

      if (sttRes.ok) {
        const sttData = await sttRes.json();
        if (sttData.transcript && sttData.transcript.trim()) {
          finalTranscript = sttData.transcript;
        }
      }
    } catch (sttErr) {
      console.warn('Server Whisper STT failed, using Web Speech API transcript:', sttErr);
    }

    if (!finalTranscript || finalTranscript.trim().length === 0) {
      setError('Could not transcribe speech. Please speak clearly or enter details manually.');
      setStep('record');
      return;
    }

    setTranscript(finalTranscript);

    try {
      // Step 2: AI Extraction
      setLoadingMessage('Understanding your information...');

      const extractRes = await fetch('/api/artisan/extract-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: finalTranscript }),
      });

      if (!extractRes.ok) {
        const extractError = await extractRes.json();
        throw new Error(extractError.error || 'Profile extraction failed');
      }

      const extractData = await extractRes.json();
      setProfile(extractData.extracted);
      setStep('review');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Processing failed');
      setStep('record');
    }
  };

  // === Confirm Profile ===
  const handleConfirm = async () => {
    if (!profile.name || profile.name.trim() === '') {
      setError('Name is required');
      return;
    }

    setLoading(true);
    setLoadingMessage('Creating your artisan profile...');
    setError('');

    try {
      const res = await fetch('/api/artisan/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: profile.name,
          location: profile.location,
          district: profile.district,
          state: profile.state,
          craftType: profile.craftType,
          experience: profile.experience,
          artisanStory: profile.artisanStory,
          language,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to create profile');
      }

      const data = await res.json();
      setArtisanId(data.profile.artisanId);
      setQrCode(data.qrCode);
      setStep('review');

      // Brief delay then redirect to home
      setTimeout(() => router.push('/artisan/home'), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create profile');
    } finally {
      setLoading(false);
    }
  };

  // === Update profile field ===
  const updateField = (field: keyof ExtractedProfile, value: string) => {
    setProfile(prev => ({ ...prev, [field]: value || null }));
  };

  // === RENDER ===

  // Success state
  if (artisanId) {
    return (
      <div className="page-center" style={{ background: 'var(--color-bg)' }}>
        <div style={{ textAlign: 'center', maxWidth: '500px' }}>
          <div className="order-success-icon">✓</div>
          <h2 style={{ marginBottom: 'var(--space-4)' }}>Welcome, {profile.name}!</h2>
          <p style={{ marginBottom: 'var(--space-6)' }}>
            Your artisan profile has been created successfully.
          </p>

          <div className="qr-container" style={{ marginBottom: 'var(--space-6)' }}>
            <span className="qr-artisan-id">{artisanId}</span>
            {qrCode && (
              <img src={qrCode} alt="QR Code" className="qr-code-img" width={200} height={200} />
            )}
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
              Scan to view your public profile
            </p>
          </div>

          <p className="loading-text">Redirecting to your dashboard...</p>
        </div>
      </div>
    );
  }

  // Processing state
  if (step === 'processing') {
    return (
      <div className="page-center" style={{ background: 'var(--color-bg)' }}>
        <div className="spinner" style={{ width: 60, height: 60, borderWidth: 4 }} />
        <p className="loading-text" style={{ fontSize: 'var(--text-xl)', marginTop: 'var(--space-6)' }}>
          {loadingMessage}
        </p>
      </div>
    );
  }

  // Review step
  if (step === 'review') {
    return (
      <div className="page" style={{ background: 'var(--color-bg)' }}>
        <div className="container container-sm" style={{ paddingTop: 'var(--space-8)' }}>
          <div style={{ textAlign: 'center', marginBottom: 'var(--space-8)' }}>
            <h2>Review Your Information</h2>
            <p>Please verify the information extracted from your voice. Edit anything that needs correction.</p>
          </div>

          {/* Transcript */}
          <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
            <div className="card-body">
              <h4 style={{ marginBottom: 'var(--space-2)', fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
                📝 Your Transcript
              </h4>
              <p style={{ fontStyle: 'italic', color: 'var(--color-text-secondary)' }}>
                &ldquo;{transcript}&rdquo;
              </p>
            </div>
          </div>

          {/* Editable Fields */}
          <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
            <div className="card-body">
              <h4 style={{ marginBottom: 'var(--space-4)' }}>Extracted Information</h4>

              {[
                { key: 'name' as const, label: 'Name', required: true, textarea: false },
                { key: 'location' as const, label: 'Location', required: false, textarea: false },
                { key: 'district' as const, label: 'District', required: false, textarea: false },
                { key: 'state' as const, label: 'State', required: false, textarea: false },
                { key: 'craftType' as const, label: 'Craft Type', required: false, textarea: false },
                { key: 'experience' as const, label: 'Experience', required: false, textarea: false },
                { key: 'artisanStory' as const, label: 'Your Story', required: false, textarea: true },
              ].map(({ key, label, required, textarea }) => (
                <div className="form-group" key={key}>
                  <label className="form-label">
                    {label} {required && <span style={{ color: 'var(--color-danger)' }}>*</span>}
                  </label>
                  {textarea ? (
                    <textarea
                      className="form-input form-textarea"
                      value={profile[key] || ''}
                      onChange={(e) => updateField(key, e.target.value)}
                      placeholder={`Enter ${label.toLowerCase()}`}
                      rows={3}
                    />
                  ) : (
                    <input
                      className="form-input"
                      value={profile[key] || ''}
                      onChange={(e) => updateField(key, e.target.value)}
                      placeholder={`Enter ${label.toLowerCase()}`}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          {error && <div className="alert alert-error">{error}</div>}

          <div style={{ display: 'flex', gap: 'var(--space-4)', marginBottom: 'var(--space-8)' }}>
            <button
              className="btn btn-secondary btn-lg"
              onClick={() => {
                setStep('record');
                setTranscript('');
                setProfile({
                  name: null, location: null, district: null, state: null,
                  craftType: null, experience: null, artisanStory: null,
                });
              }}
              style={{ flex: 1 }}
            >
              🔄 Re-record
            </button>
            <button
              className="btn btn-success btn-lg"
              onClick={handleConfirm}
              disabled={loading || !profile.name}
              style={{ flex: 2 }}
            >
              {loading ? (
                <>
                  <span className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} />
                  {loadingMessage}
                </>
              ) : (
                '✓ Confirm & Create Profile'
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Record step (default)
  return (
    <div className="page-center" style={{ background: 'var(--color-bg)' }}>
      <div style={{ textAlign: 'center', maxWidth: '500px' }}>
        <div style={{ fontSize: '3rem', marginBottom: 'var(--space-4)' }}>🎤</div>
        <h1 style={{ marginBottom: 'var(--space-3)' }}>Tell Us About Yourself</h1>
        <p style={{ marginBottom: 'var(--space-8)', fontSize: 'var(--text-lg)' }}>
          Press the microphone and speak naturally.
          Tell us your name, location, what you make, and your experience.
        </p>

        <div style={{
          background: 'var(--color-bg-secondary)',
          borderRadius: 'var(--radius-xl)',
          padding: 'var(--space-5)',
          marginBottom: 'var(--space-8)',
          textAlign: 'left',
        }}>
          <p style={{ fontSize: 'var(--text-sm)', fontStyle: 'italic', color: 'var(--color-text-secondary)' }}>
            💡 Example: &ldquo;My name is Lakshmi. I am from Tirunelveli, Tamil Nadu.
            I make handloom sarees and I have 15 years of experience.
            I learned this craft from my mother.&rdquo;
          </p>
        </div>

        <button
          className={`mic-button mic-button-lg ${recording ? 'recording' : ''}`}
          onClick={recording ? stopRecording : startRecording}
          style={{ margin: '0 auto var(--space-6)' }}
        >
          {recording ? '⏹' : '🎤'}
        </button>

        <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>
          {recording ? 'Recording... Tap to stop' : 'Tap to start recording'}
        </p>

        {error && (
          <div className="alert alert-error" style={{ marginTop: 'var(--space-4)' }}>
            {error}
          </div>
        )}

        <div style={{ marginTop: 'var(--space-8)' }}>
          <button
            className="btn btn-ghost"
            onClick={() => {
              // Skip to manual entry
              setStep('review');
            }}
          >
            ⌨️ Prefer to type? Enter manually
          </button>
        </div>
      </div>
    </div>
  );
}
