'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getTranslation, getActiveLanguage, getSpeechRecognitionLang } from '@/lib/i18n/translations';

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
  const [language, setLanguage] = useState('en');
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

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const speechRecognitionRef = useRef<unknown>(null);
  const liveTranscriptRef = useRef<string>('');

  useEffect(() => {
    const activeLang = getActiveLanguage();
    setLanguage(activeLang);
  }, []);

  const t = getTranslation(language);

  // === Voice Recording ===
  const startRecording = useCallback(async () => {
    try {
      setError('');
      liveTranscriptRef.current = '';

      // Initialize Web Speech API with the user's selected language
      const SpeechRecognition = (window as unknown as Record<string, unknown>).SpeechRecognition || (window as unknown as Record<string, unknown>).webkitSpeechRecognition;
      if (SpeechRecognition && typeof SpeechRecognition === 'function') {
        const recognition = new (SpeechRecognition as any)();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = getSpeechRecognitionLang(language);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language]);

  const stopRecording = useCallback(() => {
    if (speechRecognitionRef.current) {
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
    setLoadingMessage(t.processingAudio);

    let finalTranscript = liveTranscriptRef.current;

    try {
      // Step 1: STT Transcription (Sarvam AI / Whisper with user's selected language)
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
      } else {
        const sttErr = await sttRes.json().catch(() => ({ error: 'Unknown STT error' }));
        console.warn('[STT] Server error:', sttErr.error);
      }
    } catch (sttErr) {
      console.warn('Server STT failed, using Web Speech API transcript:', sttErr);
    }

    if (!finalTranscript || finalTranscript.trim().length === 0) {
      setError('Could not transcribe speech. Please speak for at least 3-5 seconds, then enter details manually below.');
      setStep('record');
      return;
    }

    setTranscript(finalTranscript);

    try {
      // Step 2: AI Extraction with Language Context
      setLoadingMessage(t.extractingDetails);

      const extractRes = await fetch('/api/artisan/extract-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: finalTranscript, language }),
      });

      if (!extractRes.ok) {
        const extractError = await extractRes.json();
        throw new Error(extractError.error || 'Extraction failed');
      }

      const extractData = await extractRes.json();
      setProfile({
        name: extractData.extracted.name || null,
        location: extractData.extracted.location || null,
        district: extractData.extracted.district || null,
        state: extractData.extracted.state || null,
        craftType: extractData.extracted.craftType || null,
        experience: extractData.extracted.experience || null,
        artisanStory: extractData.extracted.artisanStory || finalTranscript,
      });

      setStep('review');
    } catch (extractErr) {
      console.error('AI Extraction error:', extractErr);
      setProfile({
        name: null,
        location: null,
        district: null,
        state: null,
        craftType: null,
        experience: null,
        artisanStory: finalTranscript,
      });
      setStep('review');
    }
  };

  // === Save Profile & Generate ID ===
  const handleConfirm = async () => {
    if (!profile.name || profile.name.trim().length === 0) {
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
      setTimeout(() => router.push('/artisan/home'), 2500);
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
            <h2>{t.reviewProfileTitle}</h2>
            <p>{t.reviewProfileSubtitle}</p>
          </div>

          {/* Transcript */}
          {transcript && (
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
          )}

          {/* Editable Fields */}
          <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
            <div className="card-body">
              <h4 style={{ marginBottom: 'var(--space-4)' }}>{t.reviewProfileTitle}</h4>

              {[
                { key: 'name' as const, label: t.nameLabel, placeholder: t.namePlaceholder, required: true, textarea: false },
                { key: 'location' as const, label: t.locationLabel, placeholder: t.locationPlaceholder, required: false, textarea: false },
                { key: 'district' as const, label: 'District', placeholder: 'District', required: false, textarea: false },
                { key: 'state' as const, label: 'State', placeholder: 'State', required: false, textarea: false },
                { key: 'craftType' as const, label: t.craftTypeLabel, placeholder: t.craftPlaceholder, required: false, textarea: false },
                { key: 'experience' as const, label: t.experienceLabel, placeholder: t.experiencePlaceholder, required: false, textarea: false },
                { key: 'artisanStory' as const, label: t.storyLabel, placeholder: t.storyPlaceholder, required: false, textarea: true },
              ].map(({ key, label, placeholder, required, textarea }) => (
                <div className="form-group" key={key}>
                  <label className="form-label">
                    {label} {required && <span style={{ color: 'var(--color-danger)' }}>*</span>}
                  </label>
                  {textarea ? (
                    <textarea
                      className="form-input form-textarea"
                      value={profile[key] || ''}
                      onChange={(e) => updateField(key, e.target.value)}
                      placeholder={placeholder}
                      rows={3}
                    />
                  ) : (
                    <input
                      className="form-input"
                      value={profile[key] || ''}
                      onChange={(e) => updateField(key, e.target.value)}
                      placeholder={placeholder}
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
              {t.rerecordBtn}
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
                `✓ ${t.confirmSaveProfile}`
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
      <div style={{ textAlign: 'center', maxWidth: '540px' }}>
        <div style={{ fontSize: '3rem', marginBottom: 'var(--space-4)' }}>🎤</div>
        <h1 style={{ marginBottom: 'var(--space-3)' }}>{t.onboardingTitle}</h1>
        <p style={{ marginBottom: 'var(--space-8)', fontSize: 'var(--text-lg)' }}>
          {t.onboardingSubtitle}
        </p>

        <div style={{
          background: 'var(--color-bg-secondary)',
          borderRadius: 'var(--radius-xl)',
          padding: 'var(--space-5)',
          marginBottom: 'var(--space-8)',
          textAlign: 'left',
          lineHeight: 1.6,
        }}>
          <p style={{ fontSize: 'var(--text-sm)', fontStyle: 'italic', color: 'var(--color-text-secondary)', margin: 0 }}>
            💡 {t.onboardingExample}
          </p>
        </div>

        <button
          className={`mic-button mic-button-lg ${recording ? 'recording' : ''}`}
          onClick={recording ? stopRecording : startRecording}
          style={{ margin: '0 auto var(--space-6)' }}
        >
          {recording ? '⏹' : '🎤'}
        </button>

        <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)', fontWeight: 600 }}>
          {recording ? t.tapToStop : t.tapToRecord}
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
            ⌨️ {t.preferToType}
          </button>
        </div>
      </div>
    </div>
  );
}
