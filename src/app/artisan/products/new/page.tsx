'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getTranslation, getActiveLanguage, getSpeechRecognitionLang } from '@/lib/i18n/translations';

type CreationStep =
  | 'photo_instructions'
  | 'photo_upload'
  | 'image_processing'
  | 'voice_input'
  | 'extraction_review'
  | 'description_generation'
  | 'cost_pricing'
  | 'final_review';

interface ExtractedProductDetails {
  productName: string | null;
  category: string | null;
  material: string | null;
  quantity: number | null;
  productionTime: string | null;
  craftTechnique: string | null;
  dimensions: string | null;
  color: string | null;
  weight: string | null;
}

interface PricingBreakdown {
  productionCostRupees: number;
  marketDataAvailable: boolean;
  marketMinPricePaisa: number | null;
  marketMaxPricePaisa: number | null;
  recommendedMinPriceRupees: number;
  recommendedMaxPriceRupees: number;
  expectedMinProfitRupees: number;
  expectedMaxProfitRupees: number;
  onlinePlatforms?: Array<{
    platform: string;
    minPriceRupees: number;
    maxPriceRupees: number;
    avgPriceRupees: number;
    notes: string;
    badge?: string;
    icon?: string;
  }>;
  onlineInsight?: string;
  display: {
    productionCost: string;
    recommendedMin: string;
    recommendedMax: string;
    profitMin: string;
    profitMax: string;
    marketMin: string | null;
    marketMax: string | null;
  };
}

export default function NewProductPage() {
  const router = useRouter();
  const [language, setLanguage] = useState('en');
  const [step, setStep] = useState<CreationStep>('photo_instructions');

  useEffect(() => {
    const active = getActiveLanguage();
    setLanguage(active);
  }, []);

  const t = getTranslation(language);
  
  // Image state
  const [imageId, setImageId] = useState<string>('');
  const [originalImageUrl, setOriginalImageUrl] = useState<string>('');
  const [processedImageUrl, setProcessedImageUrl] = useState<string>('');
  const [imageProcessing, setImageProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Live Camera Viewfinder State
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<'environment' | 'user'>('environment');
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([]);
  const [activeDeviceId, setActiveDeviceId] = useState<string>('');
  const [shutterFlash, setShutterFlash] = useState(false);
  const [capturedSnapshotUrl, setCapturedSnapshotUrl] = useState<string | null>(null);
  const [capturedSnapshotBlob, setCapturedSnapshotBlob] = useState<Blob | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // Voice & STT state
  const [recording, setRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [additionalText, setAdditionalText] = useState('');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const speechRecognitionRef = useRef<unknown>(null);
  const liveTranscriptRef = useRef<string>('');

  // Extracted data state
  const [details, setDetails] = useState<ExtractedProductDetails>({
    productName: null, category: null, material: null, quantity: 1,
    productionTime: null, craftTechnique: null, dimensions: null, color: null, weight: null
  });

  // Generated Description state
  const [generatedTitle, setGeneratedTitle] = useState('');
  const [shortDesc, setShortDesc] = useState('');
  const [longDesc, setLongDesc] = useState('');
  const [highlights, setHighlights] = useState<string[]>([]);

  // Cost & Pricing state
  const [materialCost, setMaterialCost] = useState<number | ''>(0);
  const [labourType, setLabourType] = useState<'direct' | 'hours' | 'days'>('direct');
  const [labourDirectCost, setLabourDirectCost] = useState<number | ''>(0);
  const [labourHours, setLabourHours] = useState<number | ''>(0);
  const [labourRate, setLabourRate] = useState<number | ''>(0);
  const [labourDays, setLabourDays] = useState<number | ''>(0);
  const [dailyRate, setDailyRate] = useState<number | ''>(0);
  const [otherCost, setOtherCost] = useState<number | ''>(0);
  const [moq, setMoq] = useState<number>(1);
  const [minMargin, setMinMargin] = useState<number | ''>(20);
  const [maxMargin, setMaxMargin] = useState<number | ''>(35);
  const [sellingPrice, setSellingPrice] = useState<number | ''>('');
  const [pricingBreakdown, setPricingBreakdown] = useState<PricingBreakdown | null>(null);

  // Loading & Error states
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('');
  const [error, setError] = useState('');

  // === LIVE CAMERA & FILE CAPTURE HANDLERS ===
  const startCameraStream = async (targetDeviceId?: string, facing?: 'environment' | 'user') => {
    setError('');
    setCameraReady(false);
    setCapturedSnapshotBlob(null);
    if (capturedSnapshotUrl) {
      URL.revokeObjectURL(capturedSnapshotUrl);
      setCapturedSnapshotUrl(null);
    }

    if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError(t.cameraPermissionError);
      if (fileInputRef.current) fileInputRef.current.click();
      return;
    }

    // Stop previous tracks
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }

    setShowCameraModal(true);

    const facingToUse = facing || cameraFacing;
    if (facing) setCameraFacing(facing);

    try {
      let stream: MediaStream | null = null;

      // 1. If explicit deviceId provided, try that first
      if (targetDeviceId) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { deviceId: { exact: targetDeviceId } },
            audio: false,
          });
        } catch (e) {
          console.warn('Target deviceId failed, falling back:', e);
        }
      }

      // 2. Try with facingMode ideal
      if (!stream) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: { ideal: facingToUse },
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
            audio: false,
          });
        } catch (e) {
          console.warn('FacingMode ideal failed, falling back to simple video constraint:', e);
        }
      }

      // 3. Fallback to generic video: true
      if (!stream) {
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }

      mediaStreamRef.current = stream;
      setCameraStream(stream);

      // Track active device ID and discover all available cameras
      try {
        const videoTrack = stream.getVideoTracks()[0];
        if (videoTrack) {
          const settings = videoTrack.getSettings();
          if (settings.deviceId) {
            setActiveDeviceId(settings.deviceId);
          }
        }
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoInputs = devices.filter((d) => d.kind === 'videoinput');
        setAvailableCameras(videoInputs);
      } catch (enumErr) {
        console.warn('enumerateDevices error:', enumErr);
      }

      // Attach immediately to video element if already mounted
      if (videoRef.current) {
        const video = videoRef.current;
        video.muted = true;
        video.defaultMuted = true;
        video.playsInline = true;
        video.autoplay = true;
        video.srcObject = stream;
        video.play().then(() => setCameraReady(true)).catch((playErr) => {
          console.warn('Direct video play error:', playErr);
        });
      }
    } catch (err: unknown) {
      console.error('Camera stream error:', err);
      stopCameraStream();
      const errorObj = err as { name?: string };
      if (errorObj?.name === 'NotAllowedError' || errorObj?.name === 'PermissionDeniedError') {
        setError(t.cameraPermissionError);
      } else if (errorObj?.name === 'NotFoundError' || errorObj?.name === 'DevicesNotFoundError') {
        setError('No camera device detected. Please choose an image file from your device.');
      } else {
        setError(t.cameraPermissionError);
      }
      // Trigger file selector as direct fallback
      if (fileInputRef.current) fileInputRef.current.click();
    }
  };

  const stopCameraStream = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    setCameraStream(null);
    setCameraReady(false);
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    if (capturedSnapshotUrl) {
      URL.revokeObjectURL(capturedSnapshotUrl);
    }
    setCapturedSnapshotUrl(null);
    setCapturedSnapshotBlob(null);
    setShowCameraModal(false);
  };

  const switchCameraDevice = async () => {
    if (availableCameras.length > 1) {
      const currentIndex = availableCameras.findIndex((d) => d.deviceId === activeDeviceId);
      const nextIndex = (currentIndex + 1) % availableCameras.length;
      const nextDevice = availableCameras[nextIndex];
      if (nextDevice) {
        setActiveDeviceId(nextDevice.deviceId);
        await startCameraStream(nextDevice.deviceId);
        return;
      }
    }
    const nextFacing = cameraFacing === 'environment' ? 'user' : 'environment';
    setCameraFacing(nextFacing);
    await startCameraStream(undefined, nextFacing);
  };

  const captureCameraSnapshot = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;

    if (!video.videoWidth || video.videoWidth === 0 || video.readyState < 2) {
      setError('Camera is initializing. Please wait a moment.');
      return;
    }

    setShutterFlash(true);
    setTimeout(() => setShutterFlash(false), 220);

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (blob) {
        const previewUrl = URL.createObjectURL(blob);
        setCapturedSnapshotBlob(blob);
        setCapturedSnapshotUrl(previewUrl);
      }
    }, 'image/jpeg', 0.95);
  };

  const retakeCameraSnapshot = () => {
    if (capturedSnapshotUrl) {
      URL.revokeObjectURL(capturedSnapshotUrl);
    }
    setCapturedSnapshotUrl(null);
    setCapturedSnapshotBlob(null);
    if (videoRef.current && mediaStreamRef.current) {
      const video = videoRef.current;
      video.muted = true;
      video.defaultMuted = true;
      video.playsInline = true;
      video.srcObject = mediaStreamRef.current;
      video.play().catch(console.warn);
    }
  };

  const confirmCapturedSnapshot = async () => {
    if (!capturedSnapshotBlob) return;
    const file = new File([capturedSnapshotBlob], `product-photo-${Date.now()}.jpg`, { type: 'image/jpeg' });
    stopCameraStream();
    await handleImageSelect(file);
  };

  const triggerCameraCapture = () => {
    setError('');
    startCameraStream();
  };

  const triggerGalleryUpload = () => {
    setError('');
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Callback ref to automatically attach stream the instant video element is mounted
  const attachVideoRef = useCallback((node: HTMLVideoElement | null) => {
    videoRef.current = node;
    if (node && mediaStreamRef.current) {
      node.muted = true;
      node.defaultMuted = true;
      node.playsInline = true;
      node.autoplay = true;
      if (node.srcObject !== mediaStreamRef.current) {
        node.srcObject = mediaStreamRef.current;
      }
      node.play().then(() => {
        setCameraReady(true);
      }).catch((e) => {
        console.warn('Video play in attachVideoRef failed:', e);
      });
    }
  }, []);

  // Watch cameraStream state updates to ensure video element is always linked
  useEffect(() => {
    if (videoRef.current && cameraStream) {
      const video = videoRef.current;
      video.muted = true;
      video.defaultMuted = true;
      video.playsInline = true;
      video.autoplay = true;
      video.srcObject = cameraStream;
      video.play().then(() => {
        setCameraReady(true);
      }).catch((e) => {
        console.warn('Video play in cameraStream effect failed:', e);
      });
    }
  }, [cameraStream]);

  // Clean up camera stream on unmount
  useEffect(() => {
    return () => {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  // 1. Image Upload Handler
  const handleImageSelect = async (file: File) => {
    setError('');
    setLoading(true);
    setLoadingMsg('Uploading product photo...');

    try {
      const formData = new FormData();
      formData.append('image', file);

      const res = await fetch('/api/products/upload-image', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to upload image');
      }

      const data = await res.json();
      setImageId(data.image.id);
      setOriginalImageUrl(data.image.originalUrl);
      setProcessedImageUrl('');
      setStep('image_processing');
      
      // Auto trigger image enhancement, passing the URL explicitly to avoid closure lag
      processProductImage(data.image.id, data.image.originalUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Image upload failed');
    } finally {
      setLoading(false);
    }
  };

  // 2. AI Image Processing Handler
  const processProductImage = async (id: string, origUrl?: string) => {
    const originalUrlToUse = origUrl || originalImageUrl;
    setImageProcessing(true);
    setLoadingMsg('Enhancing your product image (studio lighting & centering)...');
    try {
      const res = await fetch('/api/products/process-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageId: id }),
      });

      if (!res.ok) {
        throw new Error('Image enhancement failed');
      }

      const data = await res.json();
      setProcessedImageUrl(data.image.processedUrl || originalUrlToUse);
    } catch (err) {
      console.warn('Image processing fallback:', err);
      setProcessedImageUrl(originalUrlToUse);
    } finally {
      setImageProcessing(false);
    }
  };

  // 3. Audio Recording Handler (with Web Speech API Live Recognition & Fallback)
  const startRecording = useCallback(async () => {
    try {
      setError('');
      liveTranscriptRef.current = '';

      // Initialize browser native SpeechRecognition with user's selected language
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

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await handleAudioTranscription(audioBlob);
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setRecording(true);
    } catch {
      setError('Microphone access denied or unavailable.');
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

  // 4. Transcription & Product Info Extraction
  const handleAudioTranscription = async (blob: Blob) => {
    setLoading(true);
    setLoadingMsg(t.extractingDetails);

    let finalTranscript = liveTranscriptRef.current;

    try {
      const formData = new FormData();
      formData.append('audio', blob, 'product.webm');
      formData.append('language', language);
      formData.append('purpose', 'PRODUCT_DESCRIPTION');

      const sttRes = await fetch('/api/stt/transcribe', { method: 'POST', body: formData });
      if (sttRes.ok) {
        const sttData = await sttRes.json();
        if (sttData.transcript && sttData.transcript.trim()) {
          finalTranscript = sttData.transcript;
        }
      }
    } catch (err) {
      console.warn('Server STT failed, using Web Speech API or manual input:', err);
    }

    // Combine with typed details if transcript is sparse
    if ((!finalTranscript || finalTranscript.trim().length === 0) && additionalText.trim()) {
      finalTranscript = additionalText;
    }

    if (!finalTranscript || finalTranscript.trim().length === 0) {
      setError('Could not transcribe audio. Please enter product details manually below.');
      setLoading(false);
      return;
    }

    setTranscript(finalTranscript);

    try {
      // Trigger AI / Rule-based structured extraction
      setLoadingMsg(t.extractingDetails);
      const extractRes = await fetch('/api/products/extract-details', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: finalTranscript, additionalText, language }),
      });

      if (!extractRes.ok) throw new Error('Extraction failed');
      const extractData = await extractRes.json();
      setDetails({
        productName: extractData.extracted.productName || '',
        category: extractData.extracted.category || '',
        material: extractData.extracted.material || '',
        quantity: extractData.extracted.quantity || 1,
        productionTime: extractData.extracted.productionTime || '',
        craftTechnique: extractData.extracted.craftTechnique || '',
        dimensions: extractData.extracted.dimensions || '',
        color: extractData.extracted.color || '',
        weight: extractData.extracted.weight || '',
      });

      setStep('extraction_review');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Voice processing failed');
    } finally {
      setLoading(false);
    }
  };

  // Manual proceed without voice
  const handleManualProceed = async () => {
    if (!additionalText || additionalText.trim().length === 0) {
      setError('Please type some product details before proceeding.');
      return;
    }
    await handleAudioTranscription(new Blob([], { type: 'audio/webm' }));
  };

  // 5. Generate Description
  const handleGenerateDescription = async () => {
    setLoading(true);
    setLoadingMsg('Generating product title and description...');
    try {
      const res = await fetch('/api/products/generate-description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productData: details,
          transcript: transcript || additionalText,
          additionalText,
          language,
        }),
      });

      if (!res.ok) throw new Error('Description generation failed');
      const data = await res.json();
      setGeneratedTitle(data.description.title || details.productName || 'Handcrafted Product');
      setShortDesc(data.description.shortDescription || '');
      setLongDesc(data.description.longDescription || '');
      setHighlights(data.description.highlights || []);
      setStep('cost_pricing');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setLoading(false);
    }
  };

  // 6. Calculate Price
  const handleCalculatePrice = async () => {
    let finalLabourCost = 0;
    if (labourType === 'direct') {
      finalLabourCost = Number(labourDirectCost) || 0;
    } else if (labourType === 'hours') {
      finalLabourCost = (Number(labourHours) || 0) * (Number(labourRate) || 0);
    } else if (labourType === 'days') {
      finalLabourCost = (Number(labourDays) || 0) * (Number(dailyRate) || 0);
    }

    setLoading(true);
    setLoadingMsg('Calculating pricing engine & market range...');
    try {
      const res = await fetch('/api/products/calculate-price', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          materialCost: Number(materialCost) || 0,
          labourCost: finalLabourCost,
          otherCost: Number(otherCost) || 0,
          costType: 'PER_UNIT',
          minMargin: minMargin !== '' ? Number(minMargin) : 20,
          maxMargin: maxMargin !== '' ? Number(maxMargin) : 35,
          productName: details.productName || generatedTitle,
          category: details.category,
          material: details.material,
          craftType: details.craftTechnique,
          dimensions: details.dimensions,
          weight: details.weight,
        }),
      });

      if (!res.ok) throw new Error('Pricing calculation failed');
      const data = await res.json();
      setPricingBreakdown(data.pricing);
      setSellingPrice(data.pricing.recommendedMinPriceRupees);
      setStep('final_review');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Pricing failed');
    } finally {
      setLoading(false);
    }
  };

  // 7. Final Publish
  const handlePublish = async () => {
    if (!sellingPrice || Number(sellingPrice) <= 0) {
      setError('Please specify a valid selling price');
      return;
    }

    let finalLabour = 0;
    if (labourType === 'direct') finalLabour = Number(labourDirectCost) || 0;
    if (labourType === 'hours') finalLabour = (Number(labourHours) || 0) * (Number(labourRate) || 0);
    if (labourType === 'days') finalLabour = (Number(labourDays) || 0) * (Number(dailyRate) || 0);

    setLoading(true);
    setLoadingMsg('Publishing product to marketplace...');
    try {
      const payload = {
        title: generatedTitle,
        shortDescription: shortDesc,
        longDescription: longDesc,
        highlights,
        category: details.category,
        material: details.material,
        craftTechnique: details.craftTechnique,
        dimensions: details.dimensions,
        color: details.color,
        weight: details.weight,
        productionTime: details.productionTime,
        sellingPrice: Number(sellingPrice),
        quantity: details.quantity || 1,
        moq: Number(moq) || 1,
        status: 'PUBLISHED',
        imageIds: imageId ? [imageId] : [],
        costs: {
          materialCost: Number(materialCost) || 0,
          labourCost: finalLabour,
          otherCost: Number(otherCost) || 0,
        },
        pricing: pricingBreakdown ? {
          productionCost: pricingBreakdown.productionCostRupees,
          marketMinPrice: pricingBreakdown.marketMinPricePaisa ? pricingBreakdown.marketMinPricePaisa / 100 : null,
          marketMaxPrice: pricingBreakdown.marketMaxPricePaisa ? pricingBreakdown.marketMaxPricePaisa / 100 : null,
          marketDataAvailable: pricingBreakdown.marketDataAvailable,
          recommendedMinPrice: pricingBreakdown.recommendedMinPriceRupees,
          recommendedMaxPrice: pricingBreakdown.recommendedMaxPriceRupees,
          expectedMinProfit: pricingBreakdown.expectedMinProfitRupees,
          expectedMaxProfit: pricingBreakdown.expectedMaxProfitRupees,
        } : undefined,
      };

      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to publish product');
      }

      router.push('/artisan/home');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Publish failed');
    } finally {
      setLoading(false);
    }
  };

  // Step navigation handlers
  const handleGoBack = () => {
    switch (step) {
      case 'photo_instructions':
        router.push('/artisan/home');
        break;
      case 'image_processing':
        setStep('photo_instructions');
        break;
      case 'voice_input':
        setStep('image_processing');
        break;
      case 'extraction_review':
        setStep('voice_input');
        break;
      case 'cost_pricing':
        setStep('extraction_review');
        break;
      case 'final_review':
        setStep('cost_pricing');
        break;
      default:
        router.push('/artisan/home');
    }
  };

  const getStepProgressNumber = () => {
    switch (step) {
      case 'photo_instructions': return 1;
      case 'image_processing': return 2;
      case 'voice_input': return 3;
      case 'extraction_review': return 4;
      case 'cost_pricing': return 5;
      case 'final_review': return 6;
      default: return 1;
    }
  };

  // Render Steps
  return (
    <div className="page" style={{ background: 'var(--color-bg)' }}>
      {/* Loading Overlay */}
      {loading && (
        <div className="loading-overlay" style={{ background: 'rgba(0,0,0,0.7)', zIndex: 9999 }}>
          <div className="spinner" />
          <p className="loading-text" style={{ color: 'white', marginTop: 'var(--space-3)', fontWeight: 600 }}>
            {loadingMsg || t.loading}
          </p>
        </div>
      )}

      <div className="container container-md" style={{ paddingTop: 'var(--space-6)', paddingBottom: 'var(--space-10)' }}>
        
        {/* TOP WIZARD NAVIGATION BAR WITH BACK ARROW */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 'var(--space-4)',
        }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleGoBack}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontWeight: 700,
              padding: '8px 16px',
              borderRadius: 'var(--radius-full)',
              background: 'white',
              boxShadow: 'var(--shadow-sm)',
              border: '1px solid var(--color-border)',
            }}
          >
            ← {step === 'photo_instructions' ? t.backToDashboard : t.back}
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{
              fontSize: 'var(--text-xs)',
              fontWeight: 700,
              color: 'var(--color-primary-dark)',
              background: 'rgba(37, 99, 235, 0.1)',
              padding: '4px 14px',
              borderRadius: 'var(--radius-full)',
              border: '1px solid rgba(37, 99, 235, 0.2)',
            }}>
              Step {getStepProgressNumber()} / 6
            </span>
          </div>
        </div>

        {/* Step Header */}
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-6)' }}>
          <h2 style={{ fontSize: 'var(--text-2xl)' }}>{t.productUploadTitle}</h2>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>{t.productCreationWizardSubtitle}</p>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        {/* LIVE CAMERA VIEWFINDER MODAL */}
        {showCameraModal && (
          <div className="camera-modal-backdrop">
            <div className="camera-modal-box">
              {/* Header */}
              <div className="camera-header-row">
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                  <h3 style={{ margin: 0, fontSize: 'var(--text-lg)', color: '#fff' }}>{t.cameraModalTitle}</h3>
                  {!capturedSnapshotUrl && (
                    <span className="camera-live-badge">
                      <span className="camera-live-dot" /> {cameraReady ? 'LIVE' : 'CONNECTING...'}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  style={{ minWidth: '36px', height: '36px', padding: 0, borderRadius: '50%' }}
                  onClick={stopCameraStream}
                  title={t.closeCamera}
                >
                  ✖
                </button>
              </div>

              {/* Viewfinder Container */}
              <div className="camera-viewfinder-container">
                {shutterFlash && <div className="camera-shutter-flash" />}

                {/* Loading indicator until video plays */}
                {!cameraReady && !capturedSnapshotUrl && (
                  <div style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#0a0f1d',
                    zIndex: 5,
                    color: 'white',
                  }}>
                    <div className="spinner" style={{ marginBottom: 'var(--space-3)' }} />
                    <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
                      Starting camera feed...
                    </p>
                  </div>
                )}

                {capturedSnapshotUrl ? (
                  <img
                    src={capturedSnapshotUrl}
                    alt="Captured product snapshot"
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  />
                ) : (
                  <>
                    <video
                      ref={attachVideoRef}
                      autoPlay
                      playsInline
                      muted
                      className="camera-video-feed"
                      onLoadedMetadata={(e) => {
                        const v = e.currentTarget;
                        v.muted = true;
                        v.play().catch(console.warn);
                        if (v.videoWidth > 0) setCameraReady(true);
                      }}
                      onPlaying={() => setCameraReady(true)}
                      onCanPlay={(e) => {
                        e.currentTarget.play().catch(console.warn);
                      }}
                    />
                    <div className="camera-frame-guide">
                      <div className="camera-corner-tl" />
                      <div className="camera-corner-tr" />
                      <div className="camera-corner-bl" />
                      <div className="camera-corner-br" />
                    </div>
                  </>
                )}
              </div>

              {/* Controls */}
              <div className="camera-controls-bar">
                {capturedSnapshotUrl ? (
                  <>
                    <button
                      type="button"
                      className="btn btn-secondary btn-lg"
                      style={{ flex: 1 }}
                      onClick={retakeCameraSnapshot}
                    >
                      {t.retakePhoto}
                    </button>
                    <button
                      type="button"
                      className="btn btn-success btn-lg"
                      style={{ flex: 1.2 }}
                      onClick={confirmCapturedSnapshot}
                    >
                      {t.useThisPhoto}
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={switchCameraDevice}
                      title={t.switchCamera}
                    >
                      {availableCameras.length > 1
                        ? `🔄 (${availableCameras.findIndex((d) => d.deviceId === activeDeviceId) + 1}/${availableCameras.length})`
                        : t.switchCamera}
                    </button>
                    <button
                      type="button"
                      className="btn-shutter-capture"
                      onClick={captureCameraSnapshot}
                      disabled={!cameraReady}
                    >
                      {t.captureSnapshot}
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => {
                        stopCameraStream();
                        fileInputRef.current?.click();
                      }}
                    >
                      📁 {t.uploadFromGallery}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* STEP 1: Photo Instructions */}
        {step === 'photo_instructions' && (
          <div className="card card-body">
            <h3 style={{ marginBottom: 'var(--space-4)' }}>{t.photoStepTitle}</h3>
            <div style={{ background: 'var(--color-bg-secondary)', padding: 'var(--space-4)', borderRadius: 'var(--radius-lg)', marginBottom: 'var(--space-6)' }}>
              <p style={{ margin: '0 0 var(--space-2) 0', color: 'var(--color-text-secondary)' }}>{t.photoStepSubtitle}</p>
            </div>
            
            {/* File Input for Gallery Upload */}
            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              style={{ display: 'none' }}
              onChange={(e) => {
                if (e.target.files?.[0]) handleImageSelect(e.target.files[0]);
              }}
            />

            {/* Direct Camera Input */}
            <input
              type="file"
              accept="image/*"
              capture="environment"
              ref={cameraInputRef}
              style={{ display: 'none' }}
              onChange={(e) => {
                if (e.target.files?.[0]) handleImageSelect(e.target.files[0]);
              }}
            />

            <div style={{ display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap', marginBottom: 'var(--space-4)' }}>
              <button
                className="btn btn-primary btn-lg"
                style={{ flex: 1 }}
                onClick={triggerCameraCapture}
                disabled={loading}
              >
                {t.takePhotoCamera}
              </button>

              <button
                className="btn btn-secondary btn-lg"
                style={{ flex: 1 }}
                onClick={triggerGalleryUpload}
                disabled={loading}
              >
                {t.uploadFromGallery}
              </button>
            </div>

            <button
              type="button"
              className="btn btn-outline btn-full"
              onClick={() => router.push('/artisan/home')}
            >
              ← {t.backToDashboard}
            </button>
          </div>
        )}

        {/* STEP 2: Image Processing */}
        {step === 'image_processing' && (
          <div className="card card-body">
            <h3>✨ {t.enhancingPhoto}</h3>
            <p style={{ marginBottom: 'var(--space-4)' }}>Comparing original photo with AI enhanced version</p>
            
            <div className="image-compare" style={{ marginBottom: 'var(--space-6)' }}>
              <div className="image-compare-item">
                <div className="image-compare-label">Original Photo</div>
                {originalImageUrl && <img src={originalImageUrl} alt="Original" />}
              </div>
              <div className="image-compare-item">
                <div className="image-compare-label">Enhanced Photo</div>
                {imageProcessing ? (
                  <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg-secondary)', borderRadius: 'var(--radius-lg)' }}>
                    <div className="spinner" />
                  </div>
                ) : (
                  <img src={processedImageUrl || originalImageUrl} alt="Enhanced" />
                )}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
              <button
                className="btn btn-secondary btn-lg"
                style={{ flex: 1 }}
                onClick={() => setStep('photo_instructions')}
                disabled={imageProcessing}
              >
                ← {t.back}
              </button>

              <button
                className="btn btn-primary btn-lg"
                style={{ flex: 2 }}
                onClick={() => setStep('voice_input')}
                disabled={imageProcessing}
              >
                {t.continue} →
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Voice Input */}
        {step === 'voice_input' && (
          <div className="card card-body" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: 'var(--space-2)' }}>🎤</div>
            <h3>{t.voiceStepTitle}</h3>
            <p style={{ marginBottom: 'var(--space-4)' }}>
              {t.voiceStepSubtitle}
            </p>

            <div style={{
              background: 'var(--color-bg-secondary)',
              borderRadius: 'var(--radius-lg)',
              padding: 'var(--space-4)',
              marginBottom: 'var(--space-6)',
              textAlign: 'left',
            }}>
              <p style={{ fontSize: 'var(--text-xs)', fontStyle: 'italic', color: 'var(--color-text-secondary)', margin: 0 }}>
                💡 {t.voicePromptExample}
              </p>
            </div>

            <button
              className={`mic-button mic-button-lg ${recording ? 'recording' : ''}`}
              onClick={recording ? stopRecording : startRecording}
              style={{ margin: '0 auto var(--space-6)' }}
            >
              {recording ? '⏹' : '🎤'}
            </button>
            <p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--space-6)', fontWeight: 600 }}>
              {recording ? t.tapToStop : t.tapToRecord}
            </p>

            <div className="form-group" style={{ textAlign: 'left' }}>
              <label className="form-label">{t.optionalTypedDetails}</label>
              <textarea
                className="form-input form-textarea"
                placeholder={t.addExtraDetailsPlaceholder}
                value={additionalText}
                onChange={(e) => setAdditionalText(e.target.value)}
              />
            </div>

            {transcript && (
              <div style={{ textAlign: 'left', background: 'var(--color-bg-secondary)', padding: 'var(--space-4)', borderRadius: 'var(--radius-lg)', marginBottom: 'var(--space-4)' }}>
                <strong>Transcript:</strong> &ldquo;{transcript}&rdquo;
              </div>
            )}

            <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-4)', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-secondary btn-lg"
                style={{ flex: 1 }}
                onClick={() => setStep('image_processing')}
                disabled={recording || loading}
              >
                ← {t.back}
              </button>

              <button
                type="button"
                className="btn btn-primary btn-lg"
                style={{ flex: 2 }}
                onClick={handleManualProceed}
                disabled={loading || (!transcript && !additionalText)}
              >
                {t.proceedWithTypedDetails} →
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: Extraction Review */}
        {step === 'extraction_review' && (
          <div className="card card-body">
            <h3>{t.productReviewTitle}</h3>
            <p style={{ marginBottom: 'var(--space-4)' }}>{t.reviewProfileSubtitle}</p>

            <div className="grid grid-2">
              <div className="form-group">
                <label className="form-label">{t.productTitleLabel}</label>
                <input className="form-input" value={details.productName || ''} onChange={(e) => setDetails({ ...details, productName: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">{t.categoryLabel}</label>
                <input className="form-input" value={details.category || ''} onChange={(e) => setDetails({ ...details, category: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">{t.materialLabel}</label>
                <input className="form-input" value={details.material || ''} onChange={(e) => setDetails({ ...details, material: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">{t.craftTypeLabel}</label>
                <input className="form-input" value={details.craftTechnique || ''} onChange={(e) => setDetails({ ...details, craftTechnique: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">{t.productionTimeLabel}</label>
                <input className="form-input" value={details.productionTime || ''} onChange={(e) => setDetails({ ...details, productionTime: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">{t.quantityLabel}</label>
                <input type="number" className="form-input" value={details.quantity || 1} onChange={(e) => setDetails({ ...details, quantity: Number(e.target.value) })} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-4)', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-secondary btn-lg"
                style={{ flex: 1 }}
                onClick={() => setStep('voice_input')}
                disabled={loading}
              >
                ← {t.back}
              </button>

              <button
                type="button"
                className="btn btn-primary btn-lg"
                style={{ flex: 2 }}
                onClick={handleGenerateDescription}
                disabled={loading}
              >
                {t.continue} →
              </button>
            </div>
          </div>
        )}

        {/* STEP 5: Cost & Pricing */}
        {step === 'cost_pricing' && (
          <div className="card card-body">
            <h3>💰 {t.deterministicPricingTitle}</h3>
            <p style={{ marginBottom: 'var(--space-4)' }}>{t.deterministicPricingSubtitle}</p>

            <div className="form-group">
              <label className="form-label">{t.materialCostInputLabel}</label>
              <input type="number" className="form-input" value={materialCost} onChange={(e) => setMaterialCost(e.target.value === '' ? '' : Number(e.target.value))} />
            </div>

            <div className="form-group">
              <label className="form-label">{t.labourCostCalcLabel}</label>
              <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
                <button type="button" className={`btn ${labourType === 'direct' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setLabourType('direct')}>{t.directAmountBtn}</button>
                <button type="button" className={`btn ${labourType === 'hours' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setLabourType('hours')}>{t.byHoursBtn}</button>
                <button type="button" className={`btn ${labourType === 'days' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setLabourType('days')}>{t.byDaysBtn}</button>
              </div>

              {labourType === 'direct' && (
                <input type="number" className="form-input" placeholder="0" value={labourDirectCost} onChange={(e) => setLabourDirectCost(e.target.value === '' ? '' : Number(e.target.value))} />
              )}
              {labourType === 'hours' && (
                <div className="grid grid-2">
                  <input type="number" className="form-input" placeholder="Hours" value={labourHours} onChange={(e) => setLabourHours(e.target.value === '' ? '' : Number(e.target.value))} />
                  <input type="number" className="form-input" placeholder={t.hourlyRateLabel} value={labourRate} onChange={(e) => setLabourRate(e.target.value === '' ? '' : Number(e.target.value))} />
                </div>
              )}
              {labourType === 'days' && (
                <div className="grid grid-2">
                  <input type="number" className="form-input" placeholder="Days" value={labourDays} onChange={(e) => setLabourDays(e.target.value === '' ? '' : Number(e.target.value))} />
                  <input type="number" className="form-input" placeholder={t.dailyRateLabel} value={dailyRate} onChange={(e) => setDailyRate(e.target.value === '' ? '' : Number(e.target.value))} />
                </div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">{t.otherCostsLabel}</label>
              <input type="number" className="form-input" value={otherCost} onChange={(e) => setOtherCost(e.target.value === '' ? '' : Number(e.target.value))} />
            </div>

            <div className="grid grid-2" style={{ marginBottom: 'var(--space-4)' }}>
              <div className="form-group">
                <label className="form-label">{t.artisanMinMarginLabel}</label>
                <input
                  type="number"
                  className="form-input"
                  placeholder="20"
                  value={minMargin}
                  onChange={(e) => setMinMargin(e.target.value === '' ? '' : Number(e.target.value))}
                />
              </div>
              <div className="form-group">
                <label className="form-label">{t.artisanMaxMarginLabel}</label>
                <input
                  type="number"
                  className="form-input"
                  placeholder="35"
                  value={maxMargin}
                  onChange={(e) => setMaxMargin(e.target.value === '' ? '' : Number(e.target.value))}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">{t.minOrderQtyLabel}</label>
              <input type="number" className="form-input" value={moq} onChange={(e) => setMoq(Number(e.target.value) || 1)} />
            </div>

            <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-4)', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-secondary btn-lg"
                style={{ flex: 1 }}
                onClick={() => setStep('extraction_review')}
                disabled={loading}
              >
                ← {t.back}
              </button>

              <button
                type="button"
                className="btn btn-primary btn-lg"
                style={{ flex: 2 }}
                onClick={handleCalculatePrice}
                disabled={loading}
              >
                {t.calcSellingPriceBtn} →
              </button>
            </div>
          </div>
        )}

        {/* STEP 6: Final Review */}
        {step === 'final_review' && pricingBreakdown && (
          <div className="card card-body">
            <h3 style={{ marginBottom: 'var(--space-2)' }}>{t.finalReviewTitle}</h3>
            <p style={{ marginBottom: 'var(--space-6)', color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)' }}>
              {t.finalReviewSubtitle}
            </p>

            {/* LIVE ONLINE PLATFORM PRICE COMPARISON */}
            {pricingBreakdown.onlinePlatforms && pricingBreakdown.onlinePlatforms.length > 0 && (
              <div style={{
                background: 'var(--color-bg-secondary)',
                borderRadius: 'var(--radius-xl)',
                padding: 'var(--space-5)',
                marginBottom: 'var(--space-6)',
                border: '1px solid var(--color-border)',
              }}>
                <div className="flex-between flex-wrap gap-2" style={{ marginBottom: 'var(--space-4)' }}>
                  <h4 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {t.livePlatformComparisonTitle}
                  </h4>
                  <span className="badge badge-primary" style={{ fontSize: 'var(--text-xs)' }}>
                    {t.realtimeEcommerceBenchmark}
                  </span>
                </div>

                <div className="grid grid-2" style={{ gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
                  {pricingBreakdown.onlinePlatforms.map((p, idx) => (
                    <div
                      key={idx}
                      style={{
                        background: 'white',
                        padding: 'var(--space-3) var(--space-4)',
                        borderRadius: 'var(--radius-lg)',
                        boxShadow: 'var(--shadow-sm)',
                        border: '1px solid var(--color-border)',
                      }}
                    >
                      <div className="flex-between" style={{ marginBottom: 'var(--space-1)' }}>
                        <span style={{ fontWeight: 700, fontSize: 'var(--text-sm)', color: 'var(--color-text)' }}>
                          {p.icon || '🛍️'} {p.platform}
                        </span>
                        <span style={{ fontWeight: 700, color: 'var(--color-primary-dark)', fontSize: 'var(--text-sm)' }}>
                          ₹{p.minPriceRupees.toLocaleString('en-IN')} - ₹{p.maxPriceRupees.toLocaleString('en-IN')}
                        </span>
                      </div>
                      <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', margin: 0, lineHeight: 1.4 }}>
                        {p.notes}
                      </p>
                    </div>
                  ))}
                </div>

                {pricingBreakdown.onlineInsight && (
                  <div style={{
                    background: 'rgba(37, 99, 235, 0.08)',
                    borderLeft: '4px solid var(--color-primary)',
                    padding: 'var(--space-3) var(--space-4)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: 'var(--text-xs)',
                    color: 'var(--color-text)',
                    lineHeight: 1.6,
                  }}>
                    💡 <strong>{t.marketInsightLabel}</strong> {pricingBreakdown.onlineInsight}
                  </div>
                )}
              </div>
            )}
            
            {/* Deterministic Pricing Summary */}
            <div className="pricing-breakdown" style={{ marginBottom: 'var(--space-6)' }}>
              <div className="pricing-row">
                <span className="pricing-label">{t.yourProductionCostLabel}</span>
                <span className="pricing-value" style={{ fontWeight: 700 }}>{pricingBreakdown.display.productionCost}</span>
              </div>
              <div className="pricing-row">
                <span className="pricing-label">{t.onlineRetailAvgLabel}</span>
                <span className="pricing-value">
                  {pricingBreakdown.marketDataAvailable
                    ? `${pricingBreakdown.display.marketMin} - ${pricingBreakdown.display.marketMax}`
                    : '₹' + (pricingBreakdown.recommendedMinPriceRupees * 1.4).toFixed(0)}
                </span>
              </div>
              <div className="pricing-row">
                <span className="pricing-label">{t.directRecommendedPriceLabel}</span>
                <span className="pricing-highlight">
                  {pricingBreakdown.display.recommendedMin} - {pricingBreakdown.display.recommendedMax}
                </span>
              </div>
              <div className="pricing-row">
                <span className="pricing-label">{t.yourCleanProfitLabel}</span>
                <span className="pricing-value" style={{ color: 'var(--color-success)', fontWeight: 700 }}>
                  {pricingBreakdown.display.profitMin} - {pricingBreakdown.display.profitMax} {t.zeroMiddlemanCuts}
                </span>
              </div>
            </div>

            {/* Multilingual Product Title */}
            <div className="form-group">
              <label className="form-label">🏷️ {t.productTitleFieldLabel}</label>
              <input
                className="form-input"
                value={generatedTitle}
                onChange={(e) => setGeneratedTitle(e.target.value)}
              />
            </div>

            {/* Multilingual Short Summary */}
            <div className="form-group">
              <label className="form-label">
                🌐 Multilingual Summary (English, Hindi & Regional)
              </label>
              <textarea
                className="form-input form-textarea"
                style={{ minHeight: '75px', fontSize: 'var(--text-sm)' }}
                value={shortDesc}
                onChange={(e) => setShortDesc(e.target.value)}
                placeholder="Multilingual summary (English, Hindi, Regional)"
              />
            </div>

            {/* Multilingual Detailed Story & Description */}
            <div className="form-group">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
                <label className="form-label" style={{ margin: 0 }}>
                  📜 Detailed Story (English + Hindi + Regional Language)
                </label>
                <span className="badge badge-primary" style={{ fontSize: 'var(--text-xs)' }}>
                  Multilingual AI
                </span>
              </div>
              <textarea
                className="form-input form-textarea"
                style={{ minHeight: '160px', fontFamily: 'inherit', fontSize: 'var(--text-sm)', lineHeight: 1.6 }}
                value={longDesc}
                onChange={(e) => setLongDesc(e.target.value)}
                placeholder="Detailed multilingual product description"
              />
            </div>

            {/* Final Direct Selling Price */}
            <div className="form-group">
              <label className="form-label">{t.yourDirectSellingPriceLabel}</label>
              <input
                type="number"
                className="form-input form-input-lg"
                value={sellingPrice}
                onChange={(e) => setSellingPrice(e.target.value === '' ? '' : Number(e.target.value))}
              />
            </div>

            <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-4)', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-secondary btn-lg"
                style={{ flex: 1 }}
                onClick={() => setStep('cost_pricing')}
                disabled={loading}
              >
                ← {t.editCostsBtn}
              </button>

              <button
                type="button"
                className="btn btn-success btn-lg"
                style={{ flex: 2 }}
                onClick={handlePublish}
                disabled={loading}
              >
                {t.publishToMarketplaceBtn} 🎉
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
