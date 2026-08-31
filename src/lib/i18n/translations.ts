// ============================================
// Multi-Language Localization Engine (i18n)
// Comprehensive translations for Indian Languages
// ============================================

export interface TranslationDictionary {
  // Navigation & Common
  appTitle: string;
  marketplace: string;
  dashboard: string;
  orders: string;
  notifications: string;
  logout: string;
  save: string;
  cancel: string;
  loading: string;
  continue: string;
  back: string;
  submit: string;
  edit: string;

  // Language Page
  chooseLanguageTitle: string;
  chooseLanguageSubtitle: string;

  // Onboarding Page
  onboardingTitle: string;
  onboardingSubtitle: string;
  onboardingExample: string;
  tapToRecord: string;
  recordingActive: string;
  tapToStop: string;
  processingAudio: string;
  preferToType: string;
  typeManually: string;
  reviewProfileTitle: string;
  reviewProfileSubtitle: string;
  nameLabel: string;
  locationLabel: string;
  craftTypeLabel: string;
  experienceLabel: string;
  storyLabel: string;
  namePlaceholder: string;
  locationPlaceholder: string;
  craftPlaceholder: string;
  experiencePlaceholder: string;
  storyPlaceholder: string;
  confirmSaveProfile: string;

  // Product Creation
  productUploadTitle: string;
  photoStepTitle: string;
  photoStepSubtitle: string;
  takePhotoCamera: string;
  uploadFromGallery: string;
  cameraModalTitle: string;
  captureSnapshot: string;
  closeCamera: string;
  enhancingPhoto: string;
  voiceStepTitle: string;
  voiceStepSubtitle: string;
  voicePromptGuide: string;
  voicePromptExample: string;
  extractingDetails: string;
  productReviewTitle: string;
  productTitleLabel: string;
  categoryLabel: string;
  materialLabel: string;
  quantityLabel: string;
  productionTimeLabel: string;
  colorsLabel: string;
  dimensionsLabel: string;
  generatingDescription: string;
  pricingTitle: string;
  pricingSubtitle: string;
  costBreakdownTitle: string;
  materialCost: string;
  labourCost: string;
  totalCostLabel: string;
  recommendedPriceLabel: string;
  currentStockLabel: string;
  minOrderQtyLabel: string;
  publishProductBtn: string;
  productSavedSuccess: string;

  // Dashboard & Stock
  welcomeBack: string;
  artisanIdBadge: string;
  showQRBtn: string;
  hideQRBtn: string;
  downloadQRBtn: string;
  previewProfileBtn: string;
  qrScanInstruction: string;
  totalProducts: string;
  published: string;
  drafts: string;
  addProductBtn: string;
  viewOrdersBtn: string;
  updateStockModalTitle: string;
  quickUpdateStock: string;
  inStockBadge: string;
  outOfStockBadge: string;
}

export const translations: Record<string, TranslationDictionary> = {
  // === ENGLISH ===
  en: {
    appTitle: 'Artisan Marketplace',
    marketplace: 'Marketplace',
    dashboard: 'Dashboard',
    orders: 'Orders',
    notifications: 'Notifications',
    logout: 'Logout',
    save: 'Save',
    cancel: 'Cancel',
    loading: 'Loading...',
    continue: 'Continue',
    back: 'Back',
    submit: 'Submit',
    edit: 'Edit',

    chooseLanguageTitle: 'Choose Your Language',
    chooseLanguageSubtitle: 'Select the language you are most comfortable with. All instructions and voice features will work in your language.',

    onboardingTitle: 'Tell Us About Yourself',
    onboardingSubtitle: 'Press the microphone and speak naturally. Tell us your name, location, what you make, and your craft experience.',
    onboardingExample: 'Example: "My name is Lakshmi. I am from Tirunelveli, Tamil Nadu. I make handloom silk sarees and have 15 years of weaving experience learned from my mother."',
    tapToRecord: 'Tap to start recording',
    recordingActive: 'Listening... Speak naturally',
    tapToStop: 'Tap to finish recording',
    processingAudio: 'Processing your voice with AI...',
    preferToType: 'Prefer to type? Enter manually',
    typeManually: 'Enter Profile Details Manually',
    reviewProfileTitle: 'Review Your Artisan Profile',
    reviewProfileSubtitle: 'We extracted these details from your voice. Please review and make any corrections.',
    nameLabel: 'Full Name',
    locationLabel: 'Village / City & State',
    craftTypeLabel: 'Primary Craft or Art Form',
    experienceLabel: 'Years of Experience',
    storyLabel: 'Your Artisan Heritage Story',
    namePlaceholder: 'Enter your full name',
    locationPlaceholder: 'e.g., Madurai, Tamil Nadu',
    craftPlaceholder: 'e.g., Terracotta Pottery, Handloom Weaving',
    experiencePlaceholder: 'e.g., 12 years',
    storyPlaceholder: 'Tell your story, family tradition, or craft history...',
    confirmSaveProfile: 'Save & Go to Dashboard',

    productUploadTitle: 'Add New Handcrafted Product',
    photoStepTitle: 'Take or Upload Product Photos',
    photoStepSubtitle: 'Take a clear, well-lit photo of your handicraft item against a simple background.',
    takePhotoCamera: '📸 Take Photo with Camera',
    uploadFromGallery: '🖼️ Upload from Gallery',
    cameraModalTitle: 'Live Camera Viewfinder',
    captureSnapshot: '📸 Capture Photo',
    closeCamera: 'Cancel Camera',
    enhancingPhoto: '✨ Enhancing lighting and studio background with AI...',
    voiceStepTitle: 'Describe Your Product by Voice',
    voiceStepSubtitle: 'Press the microphone and describe your item. Mention what materials you used, dimensions, color, how long it took, and how many items you have ready in stock.',
    voicePromptGuide: 'What to mention in your voice note:',
    voicePromptExample: 'Example: "This is a handmade clay water pot with terracotta finish. Height is 12 inches, weight is 1.5 kg. Made from natural riverbed clay. It takes 2 days to shape and kiln-fire. I have 10 pieces ready in stock."',
    extractingDetails: 'Extracting product specifications with AI...',
    productReviewTitle: 'Review Product Details',
    productTitleLabel: 'Product Name / Title',
    categoryLabel: 'Category',
    materialLabel: 'Primary Material',
    quantityLabel: 'Available Stock Quantity',
    productionTimeLabel: 'Production / Crafting Time',
    colorsLabel: 'Colors Available',
    dimensionsLabel: 'Dimensions / Size',
    generatingDescription: 'Generating beautiful catalog description...',
    pricingTitle: 'Smart Cost & Fair Pricing',
    pricingSubtitle: 'Transparent cost breakdown and AI recommended selling price to guarantee fair artisan profit.',
    costBreakdownTitle: 'Cost Breakdown',
    materialCost: 'Raw Material Cost',
    labourCost: 'Artisan Labour & Crafting Value',
    totalCostLabel: 'Total Production Cost',
    recommendedPriceLabel: 'Recommended Selling Price',
    currentStockLabel: 'Available In-Stock Quantity',
    minOrderQtyLabel: 'Minimum Order Quantity (MOQ for B2B)',
    publishProductBtn: '🚀 Publish Product to Marketplace',
    productSavedSuccess: 'Product published successfully!',

    welcomeBack: 'Welcome back,',
    artisanIdBadge: 'Artisan ID',
    showQRBtn: '📱 Show QR Code',
    hideQRBtn: 'Hide QR Code',
    downloadQRBtn: '📥 Download QR Image',
    previewProfileBtn: '🔗 Preview Public Profile',
    qrScanInstruction: 'Scan with any phone camera to view profile & products',
    totalProducts: 'Total Products',
    published: 'Published',
    drafts: 'Drafts',
    addProductBtn: '➕ Add Product',
    viewOrdersBtn: '📦 View Orders',
    updateStockModalTitle: '📦 Quick Update Stock Quantity',
    quickUpdateStock: '📦 Quick Update Stock',
    inStockBadge: 'In Stock',
    outOfStockBadge: 'Out of Stock',
  },

  // === TAMIL (தமிழ்) ===
  ta: {
    appTitle: 'கைவினைஞர் சந்தை',
    marketplace: 'சந்தை (Marketplace)',
    dashboard: 'முகப்பு பலகை',
    orders: 'ஆர்டர்கள்',
    notifications: 'அறிவிப்புகள்',
    logout: 'வெளியேறு',
    save: 'சேமி',
    cancel: 'ரத்து செய்',
    loading: 'ஏற்றுகிறது...',
    continue: 'தொடரவும்',
    back: 'பின்செல்க',
    submit: 'சமர்ப்பி',
    edit: 'திருத்து',

    chooseLanguageTitle: 'உங்கள் மொழியைத் தேர்ந்தெடுக்கவும்',
    chooseLanguageSubtitle: 'நீங்கள் வசதியாகப் பேசக்கூடிய மொழியைத் தேர்வுசெய்யுங்கள். அனைத்து வழிமுறைகளும் குரல் அம்சங்களும் உங்கள் மொழியில் இயங்கும்.',

    onboardingTitle: 'உங்களைப் பற்றி எங்களிடம் கூறுங்கள்',
    onboardingSubtitle: 'மைக்ரோஃபோனை அழுத்தி இயல்பாகப் பேசுங்கள். உங்கள் பெயர், ஊர், நீங்கள் என்ன கைவினை செய்கிறீர்கள் மற்றும் உங்கள் அனுபவத்தைக் கூறுங்கள்.',
    onboardingExample: 'உதாரணம்: "என் பெயர் லக்ஷ்மி. நான் திருநெல்வேலியில் வசிக்கிறேன். நான் பாரம்பரிய பட்டுப் புடவைகள் நெய்கிறேன். என் தாயாரிடம் கற்றுக்கொண்டு 15 ஆண்டுகளாக நெசவு தொழில் செய்து வருகிறேன்."',
    tapToRecord: 'பேசத் தொடங்க தட்டவும்',
    recordingActive: 'கேட்கிறது... இயல்பாகப் பேசுங்கள்',
    tapToStop: 'பதிவை முடிக்க தட்டவும்',
    processingAudio: 'உங்கள் குரலை AI மூலம் ஆராய்கிறது...',
    preferToType: 'டைப் செய்ய விரும்புகிறீர்களா? கைமுறையாக உள்ளிடவும்',
    typeManually: 'சுயவிவர விவரங்களை கைமுறையாக உள்ளிடவும்',
    reviewProfileTitle: 'உங்கள் சுயவிவரத்தை சரிபார்க்கவும்',
    reviewProfileSubtitle: 'உங்கள் குரல் பதிவிலிருந்து இந்த விவரங்களை பிரித்தெடுத்துள்ளோம். சரிபார்த்து திருத்தங்கள் செய்யவும்.',
    nameLabel: 'முழு பெயர்',
    locationLabel: 'கிராமம் / நகரம் & மாநிலம்',
    craftTypeLabel: 'முக்கிய கைவினை அல்லது கலை',
    experienceLabel: 'அனுபவ ஆண்டுகள்',
    storyLabel: 'உங்கள் கைவினை பாரம்பரியக் கதை',
    namePlaceholder: 'உங்கள் முழு பெயரை உள்ளிடவும்',
    locationPlaceholder: 'எ.கா: மதுரை, தமிழ்நாடு',
    craftPlaceholder: 'எ.கா: சுடுமண் சிற்பம், கைத்தறி நெசவு',
    experiencePlaceholder: 'எ.கா: 12 ஆண்டுகள்',
    storyPlaceholder: 'உங்கள் கைவினை வரலாறு மற்றும் குடும்ப பாரம்பரியத்தைப் பற்றி பகிருங்கள்...',
    confirmSaveProfile: 'சேமித்து முகப்புக்குச் செல்லவும்',

    productUploadTitle: 'புதிய கைவினைப் பொருளைச் சேர்க்கவும்',
    photoStepTitle: 'பொருளின் புகைப்படத்தை எடுக்கவும் அல்லது பதிவேற்றவும்',
    photoStepSubtitle: 'நல்ல வெளிச்சத்தில் உங்கள் கைவினைப் பொருளைத் தெளிவாகப் படம் பிடிக்கவும்.',
    takePhotoCamera: '📸 கேமரா மூலம் புகைப்படம் எடு',
    uploadFromGallery: '🖼️ கேலரியில் இருந்து பதிவேற்று',
    cameraModalTitle: 'நேரலை கேமரா காட்சி',
    captureSnapshot: '📸 புகைப்படம் எடு',
    closeCamera: 'கேமராவை மூடு',
    enhancingPhoto: '✨ AI மூலம் புகைப்படத்தின் பின்னணியை மெருகூட்டுகிறது...',
    voiceStepTitle: 'பொருளைப் பற்றி குரல் மூலம் விவரிக்கவும்',
    voiceStepSubtitle: 'மைக்கை அழுத்தி பொருளைப் பற்றி பேசவும். பயன்படுத்திய பொருட்கள், அளவு, நிறம், செய்ய ஆகும் நேரம் மற்றும் கையிருப்பில் உள்ள எண்ணிக்கையைக் குறிப்பிடவும்.',
    voicePromptGuide: 'உங்கள் குரல் பதிவில் குறிப்பிட வேண்டியவை:',
    voicePromptExample: 'உதாரணம்: "இது இயற்கையான களிமண்ணால் செய்யப்பட்ட பாரம்பரிய தண்ணீர் பானை. உயரம் 12 இன்ச், எடை 1.5 கிலோ. செய்து சுட வைக்க 2 நாட்கள் ஆகும். என்னிடம் 10 பொருட்கள் தயாராக உள்ளன."',
    extractingDetails: 'பொருள் விவரங்களை AI பிரித்தெடுக்கிறது...',
    productReviewTitle: 'பொருள் விவரங்களை சரிபார்க்கவும்',
    productTitleLabel: 'பொருளின் பெயர் / தலைப்பு',
    categoryLabel: 'பிரிவு (Category)',
    materialLabel: 'பயன்படுத்திய மூலப்பொருள்',
    quantityLabel: 'கையிருப்பில் உள்ள எண்ணிக்கை',
    productionTimeLabel: 'செய்ய ஆகும் நேரம்',
    colorsLabel: 'வண்ணங்கள்',
    dimensionsLabel: 'அளவுகள் / எடை',
    generatingDescription: 'கவர்ச்சிகரமான தயாரிப்பு விளக்கத்தை உருவாக்குகிறது...',
    pricingTitle: 'நியாயமான விலை & செலவு கணக்கீடு',
    pricingSubtitle: 'கைவினைஞருக்கு நியாயமான லாபத்தை உறுதி செய்யும் AI பரிந்துரைக்கப்பட்ட விற்பனை விலை.',
    costBreakdownTitle: 'செலவு விவரம்',
    materialCost: 'மூலப்பொருள் செலவு',
    labourCost: 'கைவினை உழைப்பு & நேர மதிப்பு',
    totalCostLabel: 'மொத்த தயாரிப்பு செலவு',
    recommendedPriceLabel: 'பரிந்துரைக்கப்பட்ட விற்பனை விலை',
    currentStockLabel: 'இருப்பில் உள்ள எண்ணிக்கை',
    minOrderQtyLabel: 'குறைந்தபட்ச ஆர்டர் அளவு (MOQ)',
    publishProductBtn: '🚀 சந்தையில் பொருளை வெளியிடவும்',
    productSavedSuccess: 'பொருள் வெற்றிகரமாக வெளியிடப்பட்டது!',

    welcomeBack: 'மீண்டும் நல்வரவு,',
    artisanIdBadge: 'கைவினைஞர் ஐடி',
    showQRBtn: '📱 QR குறியீட்டைக் காட்டு',
    hideQRBtn: 'QR குறியீட்டை மறை',
    downloadQRBtn: '📥 QR படத்தை பதிவிறக்கு',
    previewProfileBtn: '🔗 பொது சுயவிவரத்தைப் பார்',
    qrScanInstruction: 'சுயவிவரம் மற்றும் பொருட்களைப் பார்க்க எந்த போன் கேமராவிலும் ஸ்கேன் செய்யவும்',
    totalProducts: 'மொத்த பொருட்கள்',
    published: 'வெளியிடப்பட்டவை',
    drafts: 'வரைவுகள்',
    addProductBtn: '➕ பொருள் சேர்',
    viewOrdersBtn: '📦 ஆர்டர்களைப் பார்',
    updateStockModalTitle: '📦 கையிருப்பு எண்ணிக்கையை புதுப்பிக்கவும்',
    quickUpdateStock: '📦 கையிருப்பை புதுப்பி',
    inStockBadge: 'இருப்பில் உள்ளது',
    outOfStockBadge: 'இருப்பு இல்லை',
  },

  // === HINDI (हिन्दी) ===
  hi: {
    appTitle: 'कारीगर बाज़ार',
    marketplace: 'बाज़ार (Marketplace)',
    dashboard: 'डैशबोर्ड',
    orders: 'ऑर्डर्स',
    notifications: 'सूचनाएं',
    logout: 'लॉग आउट',
    save: 'सहेजें',
    cancel: 'रद्द करें',
    loading: 'लोड हो रहा है...',
    continue: 'आगे बढ़ें',
    back: 'पीछे',
    submit: 'जमा करें',
    edit: 'संशोधित करें',

    chooseLanguageTitle: 'अपनी भाषा चुनें',
    chooseLanguageSubtitle: 'वह भाषा चुनें जिसमें आप सबसे सहज महसूस करते हैं। सभी निर्देश और आवाज सुविधाएं आपकी भाषा में काम करेंगी।',

    onboardingTitle: 'अपने बारे में हमें बताएं',
    onboardingSubtitle: 'माइक दबाएं और स्वाभाविक रूप से बोलें। अपना नाम, स्थान, आप क्या बनाते हैं और अपना अनुभव बताएं।',
    onboardingExample: 'उदाहरण: "मेरा नाम लक्ष्मी है। मैं तिरुनेलवेली, तमिलनाडु से हूँ। मैं हथकरघा रेशमी साड़ियाँ बनाती हूँ और मुझे अपनी माँ से सीखी गई बुनाई का 15 वर्षों का अनुभव है।"',
    tapToRecord: 'रिकॉर्डिंग शुरू करने के लिए टैप करें',
    recordingActive: 'सुन रहा है... खुलकर बोलें',
    tapToStop: 'रिकॉर्डिंग समाप्त करने के लिए टैप करें',
    processingAudio: 'AI आपकी आवाज को प्रोसेस कर रहा है...',
    preferToType: 'टाइप करना पसंद करते हैं? मैन्युअल दर्ज करें',
    typeManually: 'प्रोफ़ाइल विवरण मैन्युअल दर्ज करें',
    reviewProfileTitle: 'अपनी प्रोफ़ाइल की समीक्षा करें',
    reviewProfileSubtitle: 'हमने आपकी आवाज से ये विवरण निकाले हैं। कृपया समीक्षा करें और आवश्यक सुधार करें।',
    nameLabel: 'पूरा नाम',
    locationLabel: 'गाँव / शहर और राज्य',
    craftTypeLabel: 'मुख्य हस्तकला या कला रूप',
    experienceLabel: 'अनुभव के वर्ष',
    storyLabel: 'आपकी शिल्प विरासत कहानी',
    namePlaceholder: 'अपना पूरा नाम दर्ज करें',
    locationPlaceholder: 'उदा. जयपुर, राजस्थान',
    craftPlaceholder: 'उदा. टेराकोटा मिट्टी के बर्तन, हथकरघा बुनाई',
    experiencePlaceholder: 'उदा. 10 वर्ष',
    storyPlaceholder: 'अपनी पारिवारिक शिल्प परंपरा और कहानी बताएं...',
    confirmSaveProfile: 'सहेजें और डैशबोर्ड पर जाएं',

    productUploadTitle: 'नया हस्तशिल्प उत्पाद जोड़ें',
    photoStepTitle: 'उत्पाद की तस्वीर लें या अपलोड करें',
    photoStepSubtitle: 'अच्छी रोशनी में अपने हस्तशिल्प उत्पाद की साफ तस्वीर लें।',
    takePhotoCamera: '📸 कैमरे से फोटो खींचें',
    uploadFromGallery: '🖼️ गैलरी से अपलोड करें',
    cameraModalTitle: 'लाइव कैमरा दृश्य',
    captureSnapshot: '📸 फोटो खींचें',
    closeCamera: 'कैमरा बंद करें',
    enhancingPhoto: '✨ AI द्वारा फोटो की रोशनी और स्टूडियो बैकग्राउंड में सुधार...',
    voiceStepTitle: 'आवाज द्वारा उत्पाद का वर्णन करें',
    voiceStepSubtitle: 'माइक दबाएं और अपने उत्पाद के बारे में बताएं। सामग्री, माप, रंग, बनने में लगा समय और उपलब्ध स्टॉक बताएं।',
    voicePromptGuide: 'अपनी आवाज में क्या बताएं:',
    voicePromptExample: 'उदाहरण: "यह हाथ से बना मिट्टी का पानी का घड़ा है। ऊंचाई 12 इंच है, वजन 1.5 किलोग्राम है। प्राकृतिक नदी की मिट्टी से बना है। बनाने में 2 दिन लगते हैं। मेरे पास 10 पीस स्टॉक में हैं।"',
    extractingDetails: 'AI उत्पाद विवरण निकाल रहा है...',
    productReviewTitle: 'उत्पाद विवरण की समीक्षा करें',
    productTitleLabel: 'उत्पाद का नाम / शीर्षक',
    categoryLabel: 'श्रेणी (Category)',
    materialLabel: 'मुख्य सामग्री',
    quantityLabel: 'उपलब्ध स्टॉक मात्रा',
    productionTimeLabel: 'बनाने में लगने वाला समय',
    colorsLabel: 'उपलब्ध रंग',
    dimensionsLabel: 'आकार / माप',
    generatingDescription: 'आकर्षक उत्पाद विवरण तैयार किया जा रहा है...',
    pricingTitle: 'पारदर्शी लागत और उचित मूल्य',
    pricingSubtitle: 'कारीगर के उचित लाभ को सुनिश्चित करने के लिए AI द्वारा अनुशंसित विक्रय मूल्य।',
    costBreakdownTitle: 'लागत विवरण',
    materialCost: 'कच्चे माल की लागत',
    labourCost: 'कारीगरी मेहनत और समय का मूल्य',
    totalCostLabel: 'कुल उत्पादन लागत',
    recommendedPriceLabel: 'अनुशंसित विक्रय मूल्य',
    currentStockLabel: 'उपलब्ध स्टॉक',
    minOrderQtyLabel: 'न्यूनतम ऑर्डर मात्रा (MOQ)',
    publishProductBtn: '🚀 बाज़ार में उत्पाद प्रकाशित करें',
    productSavedSuccess: 'उत्पाद सफलतापूर्वक प्रकाशित किया गया!',

    welcomeBack: 'वापसी पर स्वागत है,',
    artisanIdBadge: 'कारीगर आईडी',
    showQRBtn: '📱 QR कोड दिखाएं',
    hideQRBtn: 'QR कोड छुपाएं',
    downloadQRBtn: '📥 QR इमेज डाउनलोड करें',
    previewProfileBtn: '🔗 पब्लिक प्रोफ़ाइल देखें',
    qrScanInstruction: 'प्रोफ़ाइल और उत्पाद देखने के लिए किसी भी फोन कैमरे से स्कैन करें',
    totalProducts: 'कुल उत्पाद',
    published: 'प्रकाशित',
    drafts: 'ड्राफ्ट',
    addProductBtn: '➕ उत्पाद जोड़ें',
    viewOrdersBtn: '📦 ऑर्डर्स देखें',
    updateStockModalTitle: '📦 स्टॉक मात्रा अपडेट करें',
    quickUpdateStock: '📦 स्टॉक अपडेट करें',
    inStockBadge: 'स्टॉक में उपलब्ध',
    outOfStockBadge: 'स्टॉक समाप्त',
  },

  // === TELUGU (తెలుగు) ===
  te: {
    appTitle: 'చేతివృత్తుల మార్కెట్',
    marketplace: 'మార్కెట్‌ప్లేస్',
    dashboard: 'డ్యాష్‌బోర్డ్',
    orders: 'ఆర్డర్లు',
    notifications: 'నోటిఫికేషన్‌లు',
    logout: 'లాగౌట్',
    save: 'సేవ్ చేయండి',
    cancel: 'రద్దు చేయండి',
    loading: 'లోడ్ అవుతోంది...',
    continue: 'కొనసాగించండి',
    back: 'వెనుకకు',
    submit: 'సమర్పించండి',
    edit: 'సవరించండి',

    chooseLanguageTitle: 'మీ భాషను ఎంచుకోండి',
    chooseLanguageSubtitle: 'మీరు మాట్లాడటానికి అత్యంత సౌకర్యవంతంగా ఉండే భాషను ఎంచుకోండి. అన్ని సూచనలు మీ భాషలో ఉంటాయి.',

    onboardingTitle: 'మీ గురించి మాకు చెప్పండి',
    onboardingSubtitle: 'మైక్రోఫోన్‌ను నొక్కి మాట్లాడండి. మీ పేరు, ప్రాంతం, మీరు చేసే పని మరియు అనుభవాన్ని చెప్పండి.',
    onboardingExample: 'ఉదాహరణ: "నా పేరు లక్ష్మి. నేను ధర్మవరం నుండి వచ్చాను. నేను చేనేత పట్టు చీరలు నేస్తాను. నాకు 15 సంవత్సరాల అనుభవం ఉంది."',
    tapToRecord: 'రికార్డింగ్ ప్రారంభించడానికి నొక్కండి',
    recordingActive: 'వింటోంది... మాట్లాడండి',
    tapToStop: 'రికార్డింగ్ ముగించడానికి నొక్కండి',
    processingAudio: 'AI మీ స్వరాన్ని విశ్లేషిస్తోంది...',
    preferToType: 'టైప్ చేయాలనుకుంటున్నారా? మాన్యువల్‌గా నమోదు చేయండి',
    typeManually: 'వివరాలను మాన్యువల్‌గా నమోదు చేయండి',
    reviewProfileTitle: 'మీ ప్రొఫైల్‌ను సమీక్షించండి',
    reviewProfileSubtitle: 'మేము మీ స్వర రికార్డు నుండి ఈ వివరాలను సేకరించాము.',
    nameLabel: 'పూర్తి పేరు',
    locationLabel: 'గ్రామం / నగరం & రాష్ట్రం',
    craftTypeLabel: 'ప్రధాన కళ లేదా చేతివృత్తి',
    experienceLabel: 'అనుభవ సంవత్సరాలు',
    storyLabel: 'మీ చేతివృత్తి వారసత్వ కథ',
    namePlaceholder: 'మీ పూర్తి పేరును నమోదు చేయండి',
    locationPlaceholder: 'ఉదా: తిరుపతి, ఆంధ్రప్రదేశ్',
    craftPlaceholder: 'ఉదా: కలంకారీ, చేనేత',
    experiencePlaceholder: 'ఉదా: 10 సంవత్సరాలు',
    storyPlaceholder: 'మీ చేతివృత్తి చరిత్రను పంచుకోండి...',
    confirmSaveProfile: 'సేవ్ చేసి డ్యాష్‌బోర్డ్‌కు వెళ్లండి',

    productUploadTitle: 'కొత్త ఉత్పత్తిని జోడించండి',
    photoStepTitle: 'ఉత్పత్తి ఫోటో తీయండి లేదా అప్‌లోడ్ చేయండి',
    photoStepSubtitle: 'మంచి వెలుతురులో మీ ఉత్పత్తి యొక్క స్పష్టమైన ఫోటో తీయండి.',
    takePhotoCamera: '📸 కెమెరాతో ఫోటో తీయండి',
    uploadFromGallery: '🖼️ గ్యాలరీ నుండి అప్‌లోడ్ చేయండి',
    cameraModalTitle: 'లైవ్ కెమెరా వీక్షణ',
    captureSnapshot: '📸 ఫోటో తీయండి',
    closeCamera: 'కెమెరా మూసివేయండి',
    enhancingPhoto: '✨ AI తో ఫోటో నాణ్యత మెరుగుపరుస్తోంది...',
    voiceStepTitle: 'వస్తువు వివరాలను నోటితో చెప్పండి',
    voiceStepSubtitle: 'మైక్ నొక్కి వస్తువు తయారీ, కొలతలు, రంగులు మరియు అందుబాటులో ఉన్న స్టాక్ గురించి మాట్లాడండి.',
    voicePromptGuide: 'మీ వాయిస్ నోట్‌లో ఏమి చెప్పాలి:',
    voicePromptExample: 'ఉదాహరణ: "ఇది చేతితో చేసిన మట్టి కుండ. ఎత్తు 12 అంగుళాలు, బరువు 1.5 కేజీలు. 10 వస్తువులు సిద్ధంగా ఉన్నాయి."',
    extractingDetails: 'AI వివరాలను సేకరిస్తోంది...',
    productReviewTitle: 'ఉత్పత్తి వివరాలను సమీక్షించండి',
    productTitleLabel: 'ఉత్పత్తి పేరు',
    categoryLabel: 'వర్గం (Category)',
    materialLabel: 'ఉపయోగించిన పదార్థం',
    quantityLabel: 'అందుబాటులో ఉన్న స్టాక్',
    productionTimeLabel: 'తయారీ సమయం',
    colorsLabel: 'రంగులు',
    dimensionsLabel: 'కొలతలు / పరిమాణం',
    generatingDescription: 'వివరణ రూపొందించబడుతోంది...',
    pricingTitle: 'ధర మరియు లాభం గణన',
    pricingSubtitle: 'చేతివృత్తి కళాకారునికి న్యాయమైన లాభాన్ని అందించే AI సూచించిన అమ్మకపు ధర.',
    costBreakdownTitle: 'ఖర్చు వివరాలు',
    materialCost: 'ముడి పదార్థాల ఖర్చు',
    labourCost: 'శ్రమ మరియు నైపుణ్యం విలువ',
    totalCostLabel: 'మొత్తం ఉత్పత్తి ఖర్చు',
    recommendedPriceLabel: 'సిఫార్సు చేయబడిన అమ్మకపు ధర',
    currentStockLabel: 'అందుబాటులో ఉన్న స్టాక్',
    minOrderQtyLabel: 'కనిష్ట ఆర్డర్ పరిమాణం (MOQ)',
    publishProductBtn: '🚀 మార్కెట్‌లో ఉత్పత్తిని ప్రచురించండి',
    productSavedSuccess: 'ఉత్పత్తి విజయవంతంగా ప్రచురించబడింది!',

    welcomeBack: 'తిరిగి స్వాగతం,',
    artisanIdBadge: 'కళాకారుడు ID',
    showQRBtn: '📱 QR కోడ్ చూపించు',
    hideQRBtn: 'QR కోడ్ దాచు',
    downloadQRBtn: '📥 QR చిత్రం డౌన్‌లోడ్ చేయండి',
    previewProfileBtn: '🔗 ప్రొఫైల్ ప్రివ్యూ',
    qrScanInstruction: 'ప్రొఫైల్ మరియు ఉత్పత్తులను చూడటానికి స్కాన్ చేయండి',
    totalProducts: 'మొత్తం ఉత్పత్తులు',
    published: 'ప్రచురించబడినవి',
    drafts: 'డ్రాఫ్ట్‌లు',
    addProductBtn: '➕ ఉత్పత్తిని జోడించు',
    viewOrdersBtn: '📦 ఆర్డర్‌లను చూడండి',
    updateStockModalTitle: '📦 స్టాక్ అప్‌డేట్ చేయండి',
    quickUpdateStock: '📦 స్టాక్ అప్‌డేట్',
    inStockBadge: 'స్టాక్ ఉంది',
    outOfStockBadge: 'స్టాక్ అయిపోయింది',
  },

  // === KANNADA (ಕನ್ನಡ) ===
  kn: {
    appTitle: 'ಕುಶಲಕರ್ಮಿ ಮಾರುಕಟ್ಟೆ',
    marketplace: 'ಮಾರುಕಟ್ಟೆ',
    dashboard: 'ಡ್ಯಾಶ್‌ಬೋರ್ಡ್',
    orders: 'ಆರ್ಡರ್‌ಗಳು',
    notifications: 'ಅಧಿಸೂಚನೆಗಳು',
    logout: 'ಲಾಗ್ ಔಟ್',
    save: 'ಉಳಿಸಿ',
    cancel: 'ರದ್ದುಮಾಡಿ',
    loading: 'ಲೋಡ್ ಆಗುತ್ತಿದೆ...',
    continue: 'ಮುಂದುವರಿಯಿರಿ',
    back: 'ಹಿಂದಕ್ಕೆ',
    submit: 'ಸಲ್ಲಿಸಿ',
    edit: 'ತಿದ್ದು',

    chooseLanguageTitle: 'ನಿಮ್ಮ ಭಾಷೆಯನ್ನು ಆಯ್ಕೆಮಾಡಿ',
    chooseLanguageSubtitle: 'ನಿಮಗೆ ಹೆಚ್ಚು ಅನುಕೂಲಕರವಾದ ಭಾಷೆಯನ್ನು ಆರಿಸಿ. ಎಲ್ಲಾ ಧ್ವನಿ ಮತ್ತು ಸೂಚನೆಗಳು ನಿಮ್ಮ ಭಾಷೆಯಲ್ಲಿ ಕಾರ್ಯನಿರ್ವಹಿಸುತ್ತವೆ.',

    onboardingTitle: 'ನಿಮ್ಮ ಬಗ್ಗೆ ನಮಗೆ ತಿಳಿಸಿ',
    onboardingSubtitle: 'ಮೈಕ್ರೊಫೋನ್ ಒತ್ತಿ ಸಹಜವಾಗಿ ಮಾತನಾಡಿ. ನಿಮ್ಮ ಹೆಸರು, ಊರು, ನೀವು ಮಾಡುವ ಕಲೆ ಮತ್ತು ಅನುಭವವನ್ನು ತಿಳಿಸಿ.',
    onboardingExample: 'ಉದಾಹರಣೆ: "ನನ್ನ ಹೆಸರು ಲಕ್ಷ್ಮಿ. ನಾನು ಇಳಕಲ್ ನಿಂದ ಬಂದಿದ್ದೇನೆ. ನಾನು ಕೈಮಗ್ಗ ಸೀರೆಗಳನ್ನು ನೇಯುತ್ತೇನೆ."',
    tapToRecord: 'ರೆಕಾರ್ಡಿಂಗ್ ಪ್ರಾರಂಭಿಸಲು ಟ್ಯಾಪ್ ಮಾಡಿ',
    recordingActive: 'ಆಲಿಸುತ್ತಿದೆ... ಮುಕ್ತವಾಗಿ ಮಾತನಾಡಿ',
    tapToStop: 'ರೆಕಾರ್ಡಿಂಗ್ ಮುಗಿಸಲು ಟ್ಯಾಪ್ ಮಾಡಿ',
    processingAudio: 'AI ನಿಮ್ಮ ಧ್ವನಿಯನ್ನು ಪರಿಷ್ಕರಿಸುತ್ತಿದೆ...',
    preferToType: 'ಟೈಪ್ ಮಾಡಲು ಬಯಸುವಿರಾ?',
    typeManually: 'ವಿವರಗಳನ್ನು ಹಸ್ತಚಾಲಿತವಾಗಿ ನಮೂದಿಸಿ',
    reviewProfileTitle: 'ನಿಮ್ಮ ಪ್ರೊಫೈಲ್ ಪರಿಶೀಲಿಸಿ',
    reviewProfileSubtitle: 'ನಿಮ್ಮ ಧ್ವನಿಯಿಂದ ನಾವು ಈ ವಿವರಗಳನ್ನು ಪಡೆದುಕೊಂಡಿದ್ದೇವೆ.',
    nameLabel: 'ಪೂರ್ಣ ಹೆಸರು',
    locationLabel: 'ಗ್ರಾಮ / ನಗರ ಮತ್ತು ರಾಜ್ಯ',
    craftTypeLabel: 'ಮುಖ್ಯ ಕಲೆ ಅಥವಾ ಕರಕುಶಲ',
    experienceLabel: 'ಅನುಭವದ ವರ್ಷಗಳು',
    storyLabel: 'ನಿಮ್ಮ ಕರಕುಶಲ ಪರಂಪರೆಯ ಕಥೆ',
    namePlaceholder: 'ನಿಮ್ಮ ಪೂರ್ಣ ಹೆಸರನ್ನು ನಮೂದಿಸಿ',
    locationPlaceholder: 'ಉದಾ: ಮೈಸೂರು, ಕರ್ನಾಟಕ',
    craftPlaceholder: 'ಉದಾ: ಚನ್ನಪಟ್ಟಣದ ಬೊಂಬೆಗಳು, ಕೈಮಗ್ಗ',
    experiencePlaceholder: 'ಉದಾ: 15 ವರ್ಷಗಳು',
    storyPlaceholder: 'ನಿಮ್ಮ ಕಲೆಯ ಇತಿಹಾಸವನ್ನು ಹಂಚಿಕೊಳ್ಳಿ...',
    confirmSaveProfile: 'ಉಳಿಸಿ ಮತ್ತು ಡ್ಯಾಶ್‌ಬೋರ್ಡ್‌ಗೆ ಹೋಗಿ',

    productUploadTitle: 'ಹೊಸ ಉತ್ಪನ್ನವನ್ನು ಸೇರಿಸಿ',
    photoStepTitle: 'ಉತ್ಪನ್ನದ ಫೋಟೋ ತೆಗೆಯಿರಿ ಅಥವಾ ಅಪ್‌ಲೋಡ್ ಮಾಡಿ',
    photoStepSubtitle: 'ಉತ್ತಮ ಬೆಳಕಿನಲ್ಲಿ ನಿಮ್ಮ ಕರಕುಶಲ ವಸ್ತುವಿನ ಸ್ಪಷ್ಟ ಫೋಟೋ ತೆಗೆದುಕೊಳ್ಳಿ.',
    takePhotoCamera: '📸 ಕ್ಯಾಮೆರಾದಿಂದ ಫೋಟೋ ತೆಗೆಯಿರಿ',
    uploadFromGallery: '🖼️ ಗ್ಯಾಲರಿಯಿಂದ ಅಪ್‌ಲೋಡ್ ಮಾಡಿ',
    cameraModalTitle: 'ಲೈವ್ ಕ್ಯಾಮೆರಾ',
    captureSnapshot: '📸 ಫೋಟೋ ಸೆರೆಹಿಡಿಯಿರಿ',
    closeCamera: 'ಕ್ಯಾಮೆರಾ ಮುಚ್ಚಿ',
    enhancingPhoto: '✨ AI ಮೂಲಕ ಫೋಟೋ ಸರಿಪಡಿಸಲಾಗುತ್ತಿದೆ...',
    voiceStepTitle: 'ವಸ್ತುವಿನ ವಿವರಗಳನ್ನು ಧ್ವನಿಯ ಮೂಲಕ ವಿವರಿಸಿ',
    voiceStepSubtitle: 'ಮೈಕ್ ಒತ್ತಿ ವಸ್ತುವಿನ ತಯಾರಿಕೆ, ಅಳತೆ, ಬಣ್ಣ ಮತ್ತು ಲಭ್ಯವಿರುವ ಸ್ಟಾಕ್ ಬಗ್ಗೆ ಮಾತನಾಡಿ.',
    voicePromptGuide: 'ಧ್ವನಿಯಲ್ಲಿ ಏನು ಹೇಳಬೇಕು:',
    voicePromptExample: 'ಉದಾಹರಣೆ: "ಇದು ಕೈಯಿಂದ ಮಾಡಿದ ಮಣ್ಣಿನ ಮಡಕೆ. 10 ವಸ್ತುಗಳು ಲಭ್ಯವಿವೆ."',
    extractingDetails: 'AI ವಿವರಗಳನ್ನು ಪಡೆಯುತ್ತಿದೆ...',
    productReviewTitle: 'ಉತ್ಪನ್ನ ವಿವರಗಳನ್ನು ಪರಿಶೀಲಿಸಿ',
    productTitleLabel: 'ಉತ್ಪನ್ನದ ಹೆಸರು',
    categoryLabel: 'ವರ್ಗ',
    materialLabel: 'ಬಳಸಿದ ವಸ್ತು',
    quantityLabel: 'ಲಭ್ಯವಿರುವ ಸ್ಟಾಕ್',
    productionTimeLabel: 'ಮಾಡಲು ತಗಲುವ ಸಮಯ',
    colorsLabel: 'ಬಣ್ಣಗಳು',
    dimensionsLabel: 'ಅಳತೆಗಳು',
    generatingDescription: 'ವಿವರಣೆ ಸಿದ್ಧವಾಗುತ್ತಿದೆ...',
    pricingTitle: 'ಬೆಲೆ ಮತ್ತು ವೆಚ್ಚ ಲೆಕ್ಕಾಚಾರ',
    pricingSubtitle: 'ಕುಶಲಕರ್ಮಿಗೆ ನ್ಯಾಯಯುತ ಲಾಭವನ್ನು ಖಚಿತಪಡಿಸುವ AI ಬೆಲೆ ಶಿಫಾರಸು.',
    costBreakdownTitle: 'ವೆಚ್ಚದ ವಿವರ',
    materialCost: 'ಕಚ್ಚಾ ವಸ್ತುಗಳ ವೆಚ್ಚ',
    labourCost: 'ಕಲೆ ಮತ್ತು ಶ್ರಮದ ಮೌಲ್ಯ',
    totalCostLabel: 'ಒಟ್ಟು ಉತ್ಪಾದನಾ ವೆಚ್ಚ',
    recommendedPriceLabel: 'ಶಿಫಾರಸು ಮಾಡಿದ ಮಾರಾಟ ಬೆಲೆ',
    currentStockLabel: 'ಲಭ್ಯವಿರುವ ಸ್ಟಾಕ್',
    minOrderQtyLabel: 'ಕನಿಷ್ಠ ಆರ್ಡರ್ ಪ್ರಮಾಣ (MOQ)',
    publishProductBtn: '🚀 ಮಾರುಕಟ್ಟೆಯಲ್ಲಿ ಉತ್ಪನ್ನ ಪ್ರಕಟಿಸಿ',
    productSavedSuccess: 'ಉತ್ಪನ್ನ ಯಶಸ್ವಿಯಾಗಿ ಪ್ರಕಟಿಸಲಾಗಿದೆ!',

    welcomeBack: 'ಮತ್ತೆ ಸ್ವಾಗತ,',
    artisanIdBadge: 'ಕುಶಲಕರ್ಮಿ ID',
    showQRBtn: '📱 QR ಕೋಡ್ ತೋರಿಸಿ',
    hideQRBtn: 'QR ಕೋಡ್ ಮರೆಮಾಡಿ',
    downloadQRBtn: '📥 QR ಇಮೇಜ್ ಡೌನ್‌ಲೋಡ್ ಮಾಡಿ',
    previewProfileBtn: '🔗 ಪ್ರೊಫೈಲ್ ಮುನ್ನೋಟ',
    qrScanInstruction: 'ಪ್ರೊಫೈಲ್ ಮತ್ತು ವಸ್ತುಗಳನ್ನು ನೋಡಲು ಸ್ಕ್ಯಾನ್ ಮಾಡಿ',
    totalProducts: 'ಒಟ್ಟು ಉತ್ಪನ್ನಗಳು',
    published: 'ಪ್ರಕಟಿಸಲಾಗಿದೆ',
    drafts: 'ಕರಡುಗಳು',
    addProductBtn: '➕ ಉತ್ಪನ್ನ ಸೇರಿಸಿ',
    viewOrdersBtn: '📦 ಆರ್ಡರ್‌ಗಳನ್ನು ವೀಕ್ಷಿಸಿ',
    updateStockModalTitle: '📦 ಸ್ಟಾಕ್ ನವೀಕರಿಸಿ',
    quickUpdateStock: '📦 ಸ್ಟಾಕ್ ನವೀಕರಣ',
    inStockBadge: 'ಸ್ಟಾಕ್ ಇದೆ',
    outOfStockBadge: 'ಸ್ಟಾಕ್ ಮುಗಿದಿದೆ',
  },

  // === MALAYALAM (മലയാളം) ===
  ml: {
    appTitle: 'കൈത്തൊഴിൽ വിപണി',
    marketplace: 'വിപണി (Marketplace)',
    dashboard: 'ഡാഷ്‌ബോർഡ്',
    orders: 'ഓർഡറുകൾ',
    notifications: 'അറിയിപ്പുകൾ',
    logout: 'ലോഗ് ഔട്ട്',
    save: 'സംരക്ഷിക്കുക',
    cancel: 'റദ്ദാക്കുക',
    loading: 'ലോഡ് ചെയ്യുന്നു...',
    continue: 'തുടരുക',
    back: 'പിന്നോട്ട്',
    submit: 'സമർപ്പിക്കുക',
    edit: 'എഡിറ്റ് ചെയ്യുക',

    chooseLanguageTitle: 'നിങ്ങളുടെ ഭാഷ തിരഞ്ഞെടുക്കുക',
    chooseLanguageSubtitle: 'നിങ്ങൾക്ക് സംസാരിക്കാൻ ഏറ്റവും എളുപ്പമുള്ള ഭാഷ തിരഞ്ഞെടുക്കുക.',

    onboardingTitle: 'നിങ്ങളെക്കുറിച്ച് ഞങ്ങളോട് പറയുക',
    onboardingSubtitle: 'മൈക്രോഫോൺ അമർത്തി സംസാരിക്കുക. നിങ്ങളുടെ പേര്, സ്ഥലം, ജോലി, അനുഭവം എന്നിവ പറയുക.',
    onboardingExample: 'ഉദാഹരണം: "എന്റെ പേര് ലക്ഷ്മി. ഞാൻ കൈത്തറി പട്ടുസാരികൾ നെയ്യുന്നു."',
    tapToRecord: 'റെക്കോർഡിംഗ് ആരംഭിക്കാൻ ടാപ്പ് ചെയ്യുക',
    recordingActive: 'കേൾക്കുന്നു... സംസാരിക്കൂ',
    tapToStop: 'റെക്കോർഡിംഗ് നിർത്താൻ ടാപ്പ് ചെയ്യുക',
    processingAudio: 'ശബ്ദം AI പ്രോസസ്സ് ചെയ്യുന്നു...',
    preferToType: 'ടൈപ്പ് ചെയ്യാൻ താൽപ്പര്യമുണ്ടോ?',
    typeManually: 'വിവരങ്ങൾ നേരിട്ട് നൽകുക',
    reviewProfileTitle: 'പ്രൊഫൈൽ പരിശോധിക്കുക',
    reviewProfileSubtitle: 'നിങ്ങളുടെ ശബ്ദത്തിൽ നിന്ന് ലഭിച്ച വിവരങ്ങൾ ഇതാ.',
    nameLabel: 'മുഴുവൻ പേര്',
    locationLabel: 'സ്ഥലം & സംസ്ഥാനം',
    craftTypeLabel: 'കൈത്തൊഴിൽ കലാരൂപം',
    experienceLabel: 'പ്രവർത്തിപരിചയം',
    storyLabel: 'നിങ്ങളുടെ പാരമ്പര്യ ചരിത്രം',
    namePlaceholder: 'പേര് നൽകുക',
    locationPlaceholder: 'ഉദാ: പാലക്കാട്, കേരളം',
    craftPlaceholder: 'ഉദാ: കളിമൺ ശിൽപങ്ങൾ, കൈത്തറി',
    experiencePlaceholder: 'ഉദാ: 10 വർഷം',
    storyPlaceholder: 'നിങ്ങളുടെ അനുഭവങ്ങൾ പങ്കുവെക്കുക...',
    confirmSaveProfile: 'സേവ് ചെയ്ത് ഡാഷ്‌ബോർഡിലേക്ക് പോകുക',

    productUploadTitle: 'പുതിയ ഉൽപ്പന്നം ചേർക്കുക',
    photoStepTitle: 'ഉൽപ്പന്നത്തിന്റെ ഫോട്ടോ എടുക്കുക',
    photoStepSubtitle: 'നല്ല വെളിച്ചത്തിൽ വ്യക്തമായ ഫോട്ടോ എടുക്കുക.',
    takePhotoCamera: '📸 ക്യാമറയിൽ ഫോട്ടോ എടുക്കുക',
    uploadFromGallery: '🖼️ ഗാലറിയിൽ നിന്ന് അപ്‌ലോഡ് ചെയ്യുക',
    cameraModalTitle: 'തത്സമയ ക്യാമറ',
    captureSnapshot: '📸 ഫോട്ടോ എടുക്കുക',
    closeCamera: 'ക്യാമറ അടയ്ക്കുക',
    enhancingPhoto: '✨ AI ഉപയോഗിച്ച് ഫോട്ടോ മിനുക്കുന്നു...',
    voiceStepTitle: 'ഉൽപ്പന്ന വിവരങ്ങൾ സംസാരിച്ചു പറയുക',
    voiceStepSubtitle: 'മൈക്ക് അമർത്തി ഉൽപ്പന്നത്തിന്റെ വിവരങ്ങൾ, നിർമ്മാണ സമയം, ലഭ്യമായ സ്റ്റോക്ക് എന്നിവ പറയുക.',
    voicePromptGuide: 'ശബ്ദത്തിൽ പറയേണ്ട കാര്യങ്ങൾ:',
    voicePromptExample: 'ഉദാഹരണം: "ഇത് കളിമണ്ണിൽ നിർമ്മിച്ച കുടമാണ്. 10 എണ്ണം തയ്യാറാണ്."',
    extractingDetails: 'വിവരങ്ങൾ AI വേർതിരിച്ചെടുക്കുന്നു...',
    productReviewTitle: 'ഉൽപ്പന്ന വിവരങ്ങൾ പരിശോധിക്കുക',
    productTitleLabel: 'ഉൽപ്പന്നത്തിന്റെ പേര്',
    categoryLabel: 'വിഭാഗം',
    materialLabel: 'ഉപയോഗിച്ച വസ്തു',
    quantityLabel: 'ലഭ്യമായ എണ്ണം (Stock)',
    productionTimeLabel: 'നിർമ്മാണ സമയം',
    colorsLabel: 'നിറങ്ങൾ',
    dimensionsLabel: 'വലിപ്പം / ഭാരം',
    generatingDescription: 'വിവരണം തയ്യാറാക്കുന്നു...',
    pricingTitle: 'വിലയും ലാഭവും കണക്കാക്കൽ',
    pricingSubtitle: 'ന്യായമായ ലാഭം ഉറപ്പാക്കുന്ന AI വില നിർദ്ദേശം.',
    costBreakdownTitle: 'ചെലവ് വിവരങ്ങൾ',
    materialCost: 'അസംസ്കൃത വസ്തുക്കളുടെ ചെലവ്',
    labourCost: 'അധ്വാനത്തിന്റെയും സമയത്തിന്റെയും മൂല്യം',
    totalCostLabel: 'ആകെ നിർമ്മാണച്ചെലവ്',
    recommendedPriceLabel: 'നിർദ്ദേശിച്ച വിൽപനവില',
    currentStockLabel: 'ലഭ്യമായ സ്റ്റോക്ക്',
    minOrderQtyLabel: 'കുറഞ്ഞ ഓർഡർ അളവ് (MOQ)',
    publishProductBtn: '🚀 വിപണിയിൽ പ്രസിദ്ധീകരിക്കുക',
    productSavedSuccess: 'ഉൽപ്പന്നം വിജയകരമായി പ്രസിദ്ധീകരിച്ചു!',

    welcomeBack: 'സ്വാഗതം,',
    artisanIdBadge: 'കലാകാരൻ ID',
    showQRBtn: '📱 QR കോഡ് കാണിക്കുക',
    hideQRBtn: 'QR കോഡ് മറയ്ക്കുക',
    downloadQRBtn: '📥 QR ഡൗൺലോഡ് ചെയ്യുക',
    previewProfileBtn: '🔗 പ്രൊഫൈൽ കാണുക',
    qrScanInstruction: 'പ്രൊഫൈലും ഉൽപ്പന്നങ്ങളും കാണാൻ സ്കാൻ ചെയ്യുക',
    totalProducts: 'ആകെ ഉൽപ്പന്നങ്ങൾ',
    published: 'പ്രസിദ്ധീകരിച്ചവ',
    drafts: 'ഡ്രാഫ്റ്റുകൾ',
    addProductBtn: '➕ ഉൽപ്പന്നം ചേർക്കുക',
    viewOrdersBtn: '📦 ഓർഡറുകൾ കാണുക',
    updateStockModalTitle: '📦 സ്റ്റോക്ക് പുതുക്കുക',
    quickUpdateStock: '📦 സ്റ്റോക്ക് മാറ്റുക',
    inStockBadge: 'സ്റ്റോക്ക് ഉണ്ട്',
    outOfStockBadge: 'സ്റ്റോക്ക് തീർന്നു',
  },
};

/**
 * Retrieve translation dictionary for given locale
 * Defaults to 'en' if not found
 */
export function getTranslation(locale?: string | null): TranslationDictionary {
  const code = (locale || 'en').toLowerCase().trim();
  return translations[code] || translations.en;
}

/**
 * Get Web Speech API recognition language code
 */
export function getSpeechRecognitionLang(locale?: string | null): string {
  const map: Record<string, string> = {
    ta: 'ta-IN',
    hi: 'hi-IN',
    te: 'te-IN',
    kn: 'kn-IN',
    ml: 'ml-IN',
    mr: 'mr-IN',
    bn: 'bn-IN',
    gu: 'gu-IN',
    pa: 'pa-IN',
    ur: 'ur-IN',
    or: 'or-IN',
    en: 'en-IN',
  };
  const code = (locale || 'en').toLowerCase().trim();
  return map[code] || 'en-IN';
}

/**
 * Helper to get currently active language from cookie or localStorage
 */
export function getActiveLanguage(): string {
  if (typeof window === 'undefined') return 'en';

  const local = localStorage.getItem('artisan_lang');
  if (local) return local;

  const match = document.cookie.match(/locale=([a-z]{2})/i);
  if (match && match[1]) return match[1];

  return 'en';
}

/**
 * Helper to update active language across storage and cookies
 */
export function setActiveLanguage(locale: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('artisan_lang', locale);
  document.cookie = `locale=${locale};path=/;max-age=${365 * 24 * 60 * 60}`;
}
