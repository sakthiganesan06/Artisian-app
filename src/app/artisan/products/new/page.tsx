'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';

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
  const [step, setStep] = useState<CreationStep>('photo_instructions');
  
  // Image state
  const [imageId, setImageId] = useState<string>('');
  const [originalImageUrl, setOriginalImageUrl] = useState<string>('');
  const [processedImageUrl, setProcessedImageUrl] = useState<string>('');
  const [imageProcessing, setImageProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Live Camera Viewfinder State
  const [showCameraModal, setShowCameraModal] = useState(false);
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

  // === LIVE CAMERA VIEWFINDER MODAL ===
  const startCameraStream = async () => {
    setError('');
    setShowCameraModal(true);
    try {
      // First try environment facing camera, fallback to basic video stream for desktop/laptop webcams
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
      }

      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(e => console.warn('Play error:', e));
      }
    } catch (err) {
      console.warn('Camera stream error:', err);
      setShowCameraModal(false);
      setError('Camera access denied or unavailable. Please click "Choose File / Upload Image" to upload a photo.');
    }
  };

  const stopCameraStream = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(t => t.stop());
      mediaStreamRef.current = null;
    }
    setShowCameraModal(false);
  };

  const captureCameraSnapshot = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(async (blob) => {
      if (blob) {
        stopCameraStream();
        const file = new File([blob], 'camera-photo.jpg', { type: 'image/jpeg' });
        await handleImageSelect(file);
      }
    }, 'image/jpeg', 0.92);
  };

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
      setStep('image_processing');
      
      // Auto trigger image enhancement
      processProductImage(data.image.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Image upload failed');
    } finally {
      setLoading(false);
    }
  };

  // 2. AI Image Processing Handler
  const processProductImage = async (id: string) => {
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
      setProcessedImageUrl(data.image.processedUrl || data.image.originalUrl);
    } catch (err) {
      console.warn('Image processing fallback:', err);
      setProcessedImageUrl(originalImageUrl);
    } finally {
      setImageProcessing(false);
    }
  };

  // 3. Audio Recording Handler (with Web Speech API Live Recognition & Fallback)
  const startRecording = useCallback(async () => {
    try {
      setError('');
      liveTranscriptRef.current = '';

      // Initialize browser native SpeechRecognition
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

  // 4. Transcription & Product Info Extraction
  const handleAudioTranscription = async (blob: Blob) => {
    setLoading(true);
    setLoadingMsg('Transcribing your product description...');

    let finalTranscript = liveTranscriptRef.current;

    try {
      const formData = new FormData();
      formData.append('audio', blob, 'product.webm');
      formData.append('purpose', 'PRODUCT_DESCRIPTION');

      const sttRes = await fetch('/api/stt/transcribe', { method: 'POST', body: formData });
      if (sttRes.ok) {
        const sttData = await sttRes.json();
        if (sttData.transcript && sttData.transcript.trim()) {
          finalTranscript = sttData.transcript;
        }
      }
    } catch (err) {
      console.warn('Server Whisper STT failed, using Web Speech API or manual input:', err);
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
      setLoadingMsg('Extracting product attributes...');
      const extractRes = await fetch('/api/products/extract-details', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: finalTranscript, additionalText }),
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
        body: JSON.stringify({ productData: details, transcript: transcript || additionalText, additionalText }),
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
          category: details.category,
          material: details.material,
          craftType: details.craftTechnique,
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

  // Render Steps
  return (
    <div className="page" style={{ background: 'var(--color-bg)' }}>
      <div className="container container-md" style={{ paddingTop: 'var(--space-6)' }}>
        
        {/* Step Header */}
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-6)' }}>
          <h2 style={{ fontSize: 'var(--text-2xl)' }}>Create New Product</h2>
          <p style={{ fontSize: 'var(--text-sm)' }}>AI-assisted product creation wizard</p>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        {/* LIVE CAMERA VIEWFINDER MODAL */}
        {showCameraModal && (
          <div className="loading-overlay" style={{ background: 'rgba(0,0,0,0.9)', color: 'white' }}>
            <div style={{ position: 'relative', width: '100%', maxWidth: '640px', padding: 'var(--space-4)' }}>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{ width: '100%', borderRadius: 'var(--radius-xl)', border: '2px solid white' }}
              />
              <div style={{ display: 'flex', gap: 'var(--space-4)', marginTop: 'var(--space-4)', justifyContent: 'center' }}>
                <button className="btn btn-success btn-lg" onClick={captureCameraSnapshot}>
                  📸 Snap Photo
                </button>
                <button className="btn btn-danger btn-lg" onClick={stopCameraStream}>
                  ✖ Close Camera
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 1: Photo Instructions */}
        {step === 'photo_instructions' && (
          <div className="card card-body">
            <h3 style={{ marginBottom: 'var(--space-4)' }}>📸 Product Photo Instructions</h3>
            <div style={{ background: 'var(--color-bg-secondary)', padding: 'var(--space-4)', borderRadius: 'var(--radius-lg)', marginBottom: 'var(--space-6)' }}>
              <ul style={{ paddingLeft: 'var(--space-5)', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                <li>Center the product in your camera frame</li>
                <li>Ensure good lighting without harsh shadows</li>
                <li>Keep background clean and uncluttered</li>
                <li>Make sure the entire product is clearly visible</li>
              </ul>
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

            <div style={{ display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
              <button
                className="btn btn-primary btn-lg"
                style={{ flex: 1 }}
                onClick={startCameraStream}
                disabled={loading}
              >
                📷 Open Live Camera Viewfinder
              </button>

              <button
                className="btn btn-secondary btn-lg"
                style={{ flex: 1 }}
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}
              >
                📁 Choose File / Upload Image
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Image Processing */}
        {step === 'image_processing' && (
          <div className="card card-body">
            <h3>✨ AI Image Enhancement</h3>
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

            <button
              className="btn btn-primary btn-lg btn-full"
              onClick={() => setStep('voice_input')}
              disabled={imageProcessing}
            >
              Continue to Product Details →
            </button>
          </div>
        )}

        {/* STEP 3: Voice Input */}
        {step === 'voice_input' && (
          <div className="card card-body" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: 'var(--space-2)' }}>🎤</div>
            <h3>Describe Your Product</h3>
            <p style={{ marginBottom: 'var(--space-6)' }}>
              Speak naturally. Tell us the material, craft technique, production time, and quantity available.
            </p>

            <button
              className={`mic-button mic-button-lg ${recording ? 'recording' : ''}`}
              onClick={recording ? stopRecording : startRecording}
              style={{ margin: '0 auto var(--space-6)' }}
            >
              {recording ? '⏹' : '🎤'}
            </button>
            <p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--space-6)' }}>
              {recording ? 'Recording... Tap to stop' : 'Tap to start speaking'}
            </p>

            <div className="form-group" style={{ textAlign: 'left' }}>
              <label className="form-label">Optional Typed Details</label>
              <textarea
                className="form-input form-textarea"
                placeholder="Add any extra details manually here (e.g. Pure silk saree, 3 days to make, 5 pieces in stock)..."
                value={additionalText}
                onChange={(e) => setAdditionalText(e.target.value)}
              />
            </div>

            {transcript && (
              <div style={{ textAlign: 'left', background: 'var(--color-bg-secondary)', padding: 'var(--space-4)', borderRadius: 'var(--radius-lg)', marginBottom: 'var(--space-4)' }}>
                <strong>Transcript:</strong> &ldquo;{transcript}&rdquo;
              </div>
            )}

            <button
              className="btn btn-secondary btn-full"
              style={{ marginTop: 'var(--space-3)' }}
              onClick={handleManualProceed}
              disabled={loading || (!transcript && !additionalText)}
            >
              Proceed with Typed Details →
            </button>
          </div>
        )}

        {/* STEP 4: Extraction Review */}
        {step === 'extraction_review' && (
          <div className="card card-body">
            <h3>Review Extracted Attributes</h3>
            <p style={{ marginBottom: 'var(--space-4)' }}>Extracted product details. Edit if needed.</p>

            <div className="grid grid-2">
              <div className="form-group">
                <label className="form-label">Product Name</label>
                <input className="form-input" value={details.productName || ''} onChange={(e) => setDetails({ ...details, productName: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Category</label>
                <input className="form-input" value={details.category || ''} onChange={(e) => setDetails({ ...details, category: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Material</label>
                <input className="form-input" value={details.material || ''} onChange={(e) => setDetails({ ...details, material: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Craft Technique</label>
                <input className="form-input" value={details.craftTechnique || ''} onChange={(e) => setDetails({ ...details, craftTechnique: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Production Time</label>
                <input className="form-input" value={details.productionTime || ''} onChange={(e) => setDetails({ ...details, productionTime: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Available Stock Quantity</label>
                <input type="number" className="form-input" value={details.quantity || 1} onChange={(e) => setDetails({ ...details, quantity: Number(e.target.value) })} />
              </div>
            </div>

            <button className="btn btn-primary btn-lg btn-full" onClick={handleGenerateDescription} disabled={loading}>
              Generate Description & Title →
            </button>
          </div>
        )}

        {/* STEP 5: Cost & Pricing */}
        {step === 'cost_pricing' && (
          <div className="card card-body">
            <h3>💰 Deterministic Pricing Engine</h3>
            <p style={{ marginBottom: 'var(--space-4)' }}>Enter actual production costs. Price is calculated deterministically.</p>

            <div className="form-group">
              <label className="form-label">Material Cost (₹)</label>
              <input type="number" className="form-input" value={materialCost} onChange={(e) => setMaterialCost(e.target.value === '' ? '' : Number(e.target.value))} />
            </div>

            <div className="form-group">
              <label className="form-label">Labour Cost Calculation</label>
              <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
                <button type="button" className={`btn ${labourType === 'direct' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setLabourType('direct')}>Direct Amount</button>
                <button type="button" className={`btn ${labourType === 'hours' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setLabourType('hours')}>By Hours</button>
                <button type="button" className={`btn ${labourType === 'days' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setLabourType('days')}>By Days</button>
              </div>

              {labourType === 'direct' && (
                <input type="number" className="form-input" placeholder="Direct Labour Cost (₹)" value={labourDirectCost} onChange={(e) => setLabourDirectCost(e.target.value === '' ? '' : Number(e.target.value))} />
              )}
              {labourType === 'hours' && (
                <div className="grid grid-2">
                  <input type="number" className="form-input" placeholder="Hours" value={labourHours} onChange={(e) => setLabourHours(e.target.value === '' ? '' : Number(e.target.value))} />
                  <input type="number" className="form-input" placeholder="Rate / Hour (₹)" value={labourRate} onChange={(e) => setLabourRate(e.target.value === '' ? '' : Number(e.target.value))} />
                </div>
              )}
              {labourType === 'days' && (
                <div className="grid grid-2">
                  <input type="number" className="form-input" placeholder="Days" value={labourDays} onChange={(e) => setLabourDays(e.target.value === '' ? '' : Number(e.target.value))} />
                  <input type="number" className="form-input" placeholder="Daily Rate (₹)" value={dailyRate} onChange={(e) => setDailyRate(e.target.value === '' ? '' : Number(e.target.value))} />
                </div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Other Production Costs (₹)</label>
              <input type="number" className="form-input" value={otherCost} onChange={(e) => setOtherCost(e.target.value === '' ? '' : Number(e.target.value))} />
            </div>

            <div className="grid grid-2" style={{ marginBottom: 'var(--space-4)' }}>
              <div className="form-group">
                <label className="form-label">Artisan Minimum Profit Margin (%)</label>
                <input
                  type="number"
                  className="form-input"
                  placeholder="e.g. 20"
                  value={minMargin}
                  onChange={(e) => setMinMargin(e.target.value === '' ? '' : Number(e.target.value))}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Artisan Maximum Profit Margin (%)</label>
                <input
                  type="number"
                  className="form-input"
                  placeholder="e.g. 35"
                  value={maxMargin}
                  onChange={(e) => setMaxMargin(e.target.value === '' ? '' : Number(e.target.value))}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Minimum Order Quantity (MOQ for B2B)</label>
              <input type="number" className="form-input" value={moq} onChange={(e) => setMoq(Number(e.target.value) || 1)} />
            </div>

            <button className="btn btn-primary btn-lg btn-full" onClick={handleCalculatePrice} disabled={loading}>
              Calculate Selling Price & Market Comparison →
            </button>
          </div>
        )}

        {/* STEP 6: Final Review */}
        {step === 'final_review' && pricingBreakdown && (
          <div className="card card-body">
            <h3>Final Product Review</h3>
            
            <div className="pricing-breakdown" style={{ marginBottom: 'var(--space-6)' }}>
              <div className="pricing-row">
                <span className="pricing-label">Production Cost:</span>
                <span className="pricing-value">{pricingBreakdown.display.productionCost}</span>
              </div>
              <div className="pricing-row">
                <span className="pricing-label">Market Comparison:</span>
                <span className="pricing-value">
                  {pricingBreakdown.marketDataAvailable
                    ? `${pricingBreakdown.display.marketMin} - ${pricingBreakdown.display.marketMax}`
                    : 'Market comparison unavailable'}
                </span>
              </div>
              <div className="pricing-row">
                <span className="pricing-label">Recommended Price Range:</span>
                <span className="pricing-highlight">
                  {pricingBreakdown.display.recommendedMin} - {pricingBreakdown.display.recommendedMax}
                </span>
              </div>
              <div className="pricing-row">
                <span className="pricing-label">Estimated Profit / Unit:</span>
                <span className="pricing-value" style={{ color: 'var(--color-success)' }}>
                  {pricingBreakdown.display.profitMin} - {pricingBreakdown.display.profitMax}
                </span>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Product Title</label>
              <input className="form-input" value={generatedTitle} onChange={(e) => setGeneratedTitle(e.target.value)} />
            </div>

            <div className="form-group">
              <label className="form-label">Final Selling Price (₹)</label>
              <input type="number" className="form-input form-input-lg" value={sellingPrice} onChange={(e) => setSellingPrice(e.target.value === '' ? '' : Number(e.target.value))} />
            </div>

            <div style={{ display: 'flex', gap: 'var(--space-4)' }}>
              <button className="btn btn-secondary btn-lg" onClick={() => setStep('cost_pricing')}>
                ← Edit Costs
              </button>
              <button className="btn btn-success btn-lg" style={{ flex: 1 }} onClick={handlePublish} disabled={loading}>
                🚀 Publish Product to Marketplace
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
