/* ============================================
   ÉTAT GLOBAL DE L'APPLICATION
   ============================================ */
const state = {
    originalImage: null,
    originalDataUrl: null,
    preprocessedDataUrl: null,
    extractedText: '',
    translatedText: '',
    isProcessing: false,
    imageType: 'document',
    ocrConfidence: 0
};

/* ============================================
   RACCOURCIS DOM
   ============================================ */
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const dropZone = $('#dropZone');
const fileInput = $('#fileInput');
const uploadSection = $('#uploadSection');
const mainGrid = $('#mainGrid');
const imagePreview = $('#imagePreview');
const imagePreviewContainer = $('#imagePreviewContainer');
const progressSection = $('#progressSection');
const progressBar = $('#progressBar');
const progressLabel = $('#progressLabel');
const progressPercent = $('#progressPercent');
const ocrOutput = $('#ocrOutput');
const translateOutput = $('#translateOutput');
const translateProgress = $('#translateProgress');
const imageStats = $('#imageStats');
const ocrStats = $('#ocrStats');
const translateStats = $('#translateStats');
const ocrLang = $('#ocrLang');
const translateLang = $('#translateLang');
const preprocessCanvas = $('#preprocessCanvas');
const ctx = preprocessCanvas.getContext('2d');

/* ============================================
   PARTICULES FLOTTANTES
   ============================================ */
function createParticles() {
    const container = $('#particles');
    for (let i = 0; i < 20; i++) {
        const p = document.createElement('div');
        p.className = 'floating-particle';
        p.style.left = Math.random() * 100 + 'vw';
        p.style.top = Math.random() * 100 + 'vh';
        const dur = 15 + Math.random() * 20;
        const dx1 = Math.floor(Math.random() * 60 - 30);
        const dy1 = Math.floor(Math.random() * 80 - 40);
        const dx2 = Math.floor(Math.random() * 100 - 50);
        const dy2 = Math.floor(Math.random() * 40 - 20);
        p.style.animation = `fp${i} ${dur}s ease-in-out ${Math.random() * 10}s infinite`;
        const style = document.createElement('style');
        style.textContent = `@keyframes fp${i} {
            0%,100%{transform:translate(0,0);opacity:0.1}
            25%{transform:translate(${dx1}px,${dy1}px);opacity:0.2}
            50%{transform:translate(${dx2}px,${dy2}px);opacity:0.15}
            75%{transform:translate(${dx1 / 2}px,${dy1 * 1.2}px);opacity:0.25}
        }`;
        document.head.appendChild(style);
        container.appendChild(p);
    }
}
createParticles();

/* ============================================
   SYSTÈME DE TOAST
   ============================================ */
function showToast(message, type, duration) {
    type = type || 'info';
    duration = duration || 3500;
    const container = $('#toastContainer');
    const toast = document.createElement('div');
    toast.className = 'toast ' + type;
    const icons = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        info: 'fa-info-circle'
    };
    toast.innerHTML = '<i class="fas ' + icons[type] + '"></i> ' + message;
    container.appendChild(toast);
    setTimeout(function () {
        toast.classList.add('toast-exit');
        setTimeout(function () { toast.remove(); }, 300);
    }, duration);
}

/* ============================================
   UPLOAD D'IMAGE
   ============================================ */
dropZone.addEventListener('click', function () {
    fileInput.click();
});

fileInput.addEventListener('change', function (e) {
    if (e.target.files[0]) handleFile(e.target.files[0]);
});

dropZone.addEventListener('dragover', function (e) {
    e.preventDefault();
    dropZone.classList.add('drag-over');
});

dropZone.addEventListener('dragleave', function () {
    dropZone.classList.remove('drag-over');
});

dropZone.addEventListener('drop', function (e) {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    var file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
        handleFile(file);
    } else {
        showToast('Veuillez deposer un fichier image valide', 'error');
    }
});

function handleFile(file) {
    var reader = new FileReader();
    reader.onload = function (e) {
        state.originalDataUrl = e.target.result;
        state.preprocessedDataUrl = null;
        showMainView(e.target.result);
        showToast('Image "' + file.name + '" chargee avec succes', 'success');
    };
    reader.readAsDataURL(file);
}

function showMainView(dataUrl) {
    uploadSection.style.display = 'none';
    mainGrid.style.display = 'grid';
    var img = new Image();
    img.onload = function () {
        state.originalImage = img;
        imagePreview.src = dataUrl;
        resetPreprocessSliders();
        displayImageStats(img);
        resetResults();
    };
    img.src = dataUrl;
}

function displayImageStats(img) {
    var sizeKo = (state.originalDataUrl.length * 0.75 / 1024).toFixed(0);
    var typeName = state.imageType.charAt(0).toUpperCase() + state.imageType.slice(1);
    imageStats.innerHTML =
        '<div class="stat-badge"><i class="fas fa-ruler-combined"></i> ' + img.naturalWidth + ' x ' + img.naturalHeight + 'px</div>' +
        '<div class="stat-badge"><i class="fas fa-palette"></i> ' + typeName + '</div>' +
        '<div class="stat-badge"><i class="fas fa-weight-hanging"></i> ~' + sizeKo + ' Ko</div>';
}

function resetResults() {
    state.extractedText = '';
    state.translatedText = '';
    state.ocrConfidence = 0;
    ocrOutput.innerHTML = '<span class="placeholder-text">Le texte extrait apparaitra ici apres le traitement OCR...</span>';
    translateOutput.style.display = 'none';
    translateOutput.textContent = '';
    ocrStats.innerHTML = '';
    translateStats.innerHTML = '';
    $('#btnCopy').disabled = true;
    $('#btnTranslate').disabled = true;
    $('#btnExportTxt').disabled = true;
    $('#btnExportJson').disabled = true;
    $('#btnExportMarkdown').disabled = true;
}

/* ============================================
   BOUTON NOUVELLE IMAGE
   ============================================ */
 $('#btnResetImage').addEventListener('click', function () {
    uploadSection.style.display = 'block';
    mainGrid.style.display = 'none';
    fileInput.value = '';
    state.originalImage = null;
    state.originalDataUrl = null;
    state.preprocessedDataUrl = null;
});

/* ============================================
   PRÉTRAITMENT D'IMAGE
   ============================================ */
var contrastSlider = $('#contrastSlider');
var brightnessSlider = $('#brightnessSlider');
var thresholdSlider = $('#thresholdSlider');
var blurSlider = $('#blurSlider');

var sliders = [contrastSlider, brightnessSlider, thresholdSlider, blurSlider];
sliders.forEach(function (slider) {
    slider.addEventListener('input', function () {
        var valId = slider.id.replace('Slider', 'Val');
        $('#' + valId).textContent = slider.value;
    });
});

 $('#btnApplyPreprocess').addEventListener('click', applyPreprocessing);

 $('#btnResetPreprocess').addEventListener('click', function () {
    resetPreprocessSliders();
    if (state.originalDataUrl) {
        imagePreview.src = state.originalDataUrl;
        state.preprocessedDataUrl = null;
        showToast('Pretraitement annule', 'info');
    }
});

function resetPreprocessSliders() {
    contrastSlider.value = 0;
    brightnessSlider.value = 0;
    thresholdSlider.value = 0;
    blurSlider.value = 0;
    $('#contrastVal').textContent = '0';
    $('#brightnessVal').textContent = '0';
    $('#thresholdVal').textContent = '0';
    $('#blurVal').textContent = '0';
}

function applyPreprocessing() {
    if (!state.originalImage) {
        showToast('Veuillez d\'abord charger une image', 'error');
        return;
    }

    var img = state.originalImage;
    var w = img.naturalWidth;
    var h = img.naturalHeight;
    preprocessCanvas.width = w;
    preprocessCanvas.height = h;

    var contrast = parseInt(contrastSlider.value);
    var brightness = parseInt(brightnessSlider.value);
    var threshold = parseInt(thresholdSlider.value);
    var blur = parseInt(blurSlider.value);

    // Appliquer filtres CSS
    var filterStr = 'brightness(' + (1 + brightness / 100) + ') contrast(' + (1 + contrast / 100) + ')';
    if (blur > 0) filterStr += ' blur(' + blur + 'px)';
    ctx.filter = filterStr;
    ctx.drawImage(img, 0, 0, w, h);
    ctx.filter = 'none';

    // Binarisation si seuil > 0
    if (threshold > 0) {
        var imageData = ctx.getImageData(0, 0, w, h);
        var data = imageData.data;
        for (var i = 0; i < data.length; i += 4) {
            var gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
            var val = gray >= threshold ? 255 : 0;
            data[i] = val;
            data[i + 1] = val;
            data[i + 2] = val;
        }
        ctx.putImageData(imageData, 0, 0);
    }

    state.preprocessedDataUrl = preprocessCanvas.toDataURL('image/png');
    imagePreview.src = state.preprocessedDataUrl;
    showToast('Pretraitement applique avec succes', 'success');
}

/* ============================================
   TYPES DE DÉMONSTRATION
   ============================================ */
var langHints = { document: 'fra', photo: 'eng', panneau: 'fra', recu: 'fra' };

 $$('.demo-type-card').forEach(function (card) {
    card.addEventListener('click', function () {
        $$('.demo-type-card').forEach(function (c) {
            c.classList.remove('selected');
        });
        card.classList.add('selected');
        state.imageType = card.dataset.type;
        if (langHints[card.dataset.type]) {
            ocrLang.value = langHints[card.dataset.type];
        }
    });
});

/* ============================================
   EXTRACTION OCR AVEC TESSERACT.JS
   ============================================ */
 $('#btnExtract').addEventListener('click', startOCR);

async function startOCR() {
    if (state.isProcessing) return;
    if (!state.originalImage) {
        showToast('Veuillez d\'abord charger une image', 'error');
        return;
    }

    state.isProcessing = true;
    var btn = $('#btnExtract');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span>&nbsp; Extraction en cours...';
    progressSection.style.display = 'block';
    imagePreviewContainer.classList.add('scanning');

    try {
        var imageData = state.preprocessedDataUrl || state.originalDataUrl;
        var lang = ocrLang.value;

        var result = await Tesseract.recognize(imageData, lang, {
            logger: function (m) {
                if (m.status === 'recognizing text') {
                    var pct = Math.round(m.progress * 100);
                    progressBar.style.width = pct + '%';
                    progressPercent.textContent = pct + '%';
                    progressLabel.textContent = 'Reconnaissance du texte...';
                } else if (m.status === 'loading language traineddata') {
                    var pct2 = Math.round(m.progress * 30);
                    progressBar.style.width = pct2 + '%';
                    progressPercent.textContent = pct2 + '%';
                    progressLabel.textContent = 'Chargement du modele ' + lang + '...';
                } else if (m.status === 'initializing api') {
                    progressLabel.textContent = 'Initialisation de l\'API...';
                }
            }
        });

        state.extractedText = result.data.text.trim();
        state.ocrConfidence = result.data.confidence;

        if (state.extractedText.length > 0) {
            ocrOutput.textContent = state.extractedText;

            var words = state.extractedText.split(/\s+/).filter(function (w) { return w.length > 0; });
            var lines = state.extractedText.split('\n').filter(function (l) { return l.trim().length > 0; });

            ocrStats.innerHTML =
                '<div class="stat-badge"><i class="fas fa-font"></i> Mots : <span class="val">' + words.length + '</span></div>' +
                '<div class="stat-badge"><i class="fas fa-list"></i> Lignes : <span class="val">' + lines.length + '</span></div>' +
                '<div class="stat-badge"><i class="fas fa-keyboard"></i> Caracteres : <span class="val">' + state.extractedText.length + '</span></div>' +
                '<div class="stat-badge"><i class="fas fa-bullseye"></i> Confiance : <span class="val">' + state.ocrConfidence.toFixed(1) + '%</span></div>';

            $('#btnCopy').disabled = false;
            $('#btnTranslate').disabled = false;
            $('#btnExportTxt').disabled = false;
            $('#btnExportJson').disabled = false;
            $('#btnExportMarkdown').disabled = false;

            showToast('Extraction reussie : ' + words.length + ' mots (' + state.ocrConfidence.toFixed(1) + '% confiance)', 'success');
        } else {
            ocrOutput.innerHTML = '<span style="color: var(--warning);">Aucun texte detecte. Essayez le pretraitement ou changez la langue.</span>';
            ocrStats.innerHTML = '';
            showToast('Aucun texte detecte', 'error');
        }

    } catch (err) {
        console.error('Erreur OCR :', err);
        ocrOutput.innerHTML = '<span style="color: var(--error);">Erreur : ' + err.message + '</span>';
        showToast('Erreur lors de l\'extraction OCR', 'error');
    } finally {
        state.isProcessing = false;
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-magnifying-glass"></i>&nbsp; Lancer l\'extraction du texte';
        imagePreviewContainer.classList.remove('scanning');
        setTimeout(function () {
            progressSection.style.display = 'none';
            progressBar.style.width = '0%';
        }, 800);
    }
}

/* ============================================
   COPIER LE TEXTE
   ============================================ */
 $('#btnCopy').addEventListener('click', function () {
    if (!state.extractedText) return;
    navigator.clipboard.writeText(state.extractedText).then(function () {
        var feedback = $('#copyFeedback');
        feedback.classList.add('show');
        setTimeout(function () { feedback.classList.remove('show'); }, 1500);
        showToast('Texte copie dans le presse-papiers', 'success');
    }).catch(function () {
        var ta = document.createElement('textarea');
        ta.value = state.extractedText;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        ta.remove();
        showToast('Texte copie', 'success');
    });
});

/* ============================================
   TRADUCTION VIA MYMEMORY API
   ============================================ */
 $('#btnTranslate').addEventListener('click', translateText);

function mapLangForAPI(ocrCode) {
    var map = {
        fra: 'fr', eng: 'en', ara: 'ar', deu: 'de', spa: 'es',
        chi_sim: 'zh', jpn: 'ja', kor: 'ko', por: 'pt', rus: 'ru', ita: 'it'
    };
    return map[ocrCode] || 'en';
}

async function translateText() {
    if (!state.extractedText || state.extractedText.length === 0) {
        showToast('Aucun texte a traduire', 'error');
        return;
    }

    var targetLang = translateLang.value;
    var sourceLang = mapLangForAPI(ocrLang.value);

    if (sourceLang === targetLang) {
        showToast('La langue source et cible sont identiques', 'error');
        return;
    }

    var textToTranslate = state.extractedText.substring(0, 500);
    var truncated = state.extractedText.length > 500;

    translateProgress.style.display = 'flex';
    translateOutput.style.display = 'none';
    $('#btnTranslate').disabled = true;

    try {
        var url = 'https://api.mymemory.translated.net/get?q=' + encodeURIComponent(textToTranslate) + '&langpair=' + sourceLang + '|' + targetLang;
        var response = await fetch(url);
        var data = await response.json();

        if (data.responseStatus === 200 && data.responseData) {
            state.translatedText = data.responseData.translatedText;
            var extra = truncated ? '\n\n[... Traduction tronquee a 500 caracteres ...]' : '';
            translateOutput.textContent = state.translatedText + extra;
            translateOutput.style.display = 'block';

            var match = data.responseData.match ? data.responseData.match.toFixed(1) : 'N/A';
            var truncBadge = truncated ? '<div class="stat-badge" style="border-color: var(--warning); color: var(--warning);"><i class="fas fa-exclamation-triangle"></i> Tronque</div>' : '';

            translateStats.innerHTML =
                '<div class="stat-badge"><i class="fas fa-arrow-right-arrow-left"></i> ' + sourceLang.toUpperCase() + ' → ' + targetLang.toUpperCase() + '</div>' +
                '<div class="stat-badge"><i class="fas fa-bullseye"></i> Qualite : <span class="val">' + match + '%</span></div>' +
                truncBadge;

            showToast('Traduction terminee avec succes', 'success');
        } else {
            throw new Error(data.responseDetails || 'Erreur de traduction');
        }
    } catch (err) {
        console.error('Erreur traduction :', err);
        translateOutput.textContent = 'Erreur de traduction : ' + err.message;
        translateOutput.style.display = 'block';
        showToast('Erreur lors de la traduction', 'error');
    } finally {
        translateProgress.style.display = 'none';
        $('#btnTranslate').disabled = false;
    }
}

/* ============================================
   EXPORT DES RÉSULTATS
   ============================================ */
 $('#btnExportTxt').addEventListener('click', function () {
    if (!state.extractedText) return;
    var content = '=== TEXTE EXTRAIT (OCR) ===\n';
    content += 'Langue : ' + ocrLang.options[ocrLang.selectedIndex].text + '\n';
    content += 'Confiance : ' + state.ocrConfidence.toFixed(1) + '%\n';
    content += 'Type d\'image : ' + state.imageType + '\n';
    content += 'Date : ' + new Date().toLocaleString('fr-FR') + '\n\n';
    content += state.extractedText;
    if (state.translatedText) {
        content += '\n\n=== TRADUCTION (' + translateLang.options[translateLang.selectedIndex].text + ') ===\n\n';
        content += state.translatedText;
    }
    downloadFile(content, 'ocr-resultat.txt', 'text/plain');
    showToast('Fichier TXT exporte', 'success');
});

 $('#btnExportJson').addEventListener('click', function () {
    if (!state.extractedText) return;
    var words = state.extractedText.split(/\s+/).filter(function (w) { return w.length > 0; });
    var lines = state.extractedText.split('\n').filter(function (l) { return l.trim().length > 0; });
    var dimensions = state.originalImage ? state.originalImage.naturalWidth + 'x' + state.originalImage.naturalHeight : 'inconnu';

    var data = {
        meta: {
            date: new Date().toISOString(),
            langue_ocr: ocrLang.value,
            confiance: state.ocrConfidence,
            type_image: state.imageType,
            dimensions: dimensions
        },
        texte_extrait: state.extractedText,
        traduction: state.translatedText ? {
            langue_cible: translateLang.value,
            texte: state.translatedText
        } : null,
        statistiques: {
            mots: words.length,
            lignes: lines.length,
            caracteres: state.extractedText.length
        }
    };
    downloadFile(JSON.stringify(data, null, 2), 'ocr-resultat.json', 'application/json');
    showToast('Fichier JSON exporte', 'success');
});

 $('#btnExportMarkdown').addEventListener('click', function () {
    if (!state.extractedText) return;
    var md = '# Resultat OCR\n\n';
    md += '- **Langue** : ' + ocrLang.options[ocrLang.selectedIndex].text + '\n';
    md += '- **Confiance** : ' + state.ocrConfidence.toFixed(1) + '%\n';
    md += '- **Type** : ' + state.imageType + '\n';
    md += '- **Date** : ' + new Date().toLocaleString('fr-FR') + '\n\n';
    md += '## Texte extrait\n\n```\n' + state.extractedText + '\n```\n';
    if (state.translatedText) {
        md += '\n## Traduction (' + translateLang.options[translateLang.selectedIndex].text + ')\n\n```\n' + state.translatedText + '\n```\n';
    }
    downloadFile(md, 'ocr-resultat.md', 'text/markdown');
    showToast('Fichier Markdown exporte', 'success');
});

function downloadFile(content, filename, mimeType) {
    var blob = new Blob([content], { type: mimeType + ';charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/* ============================================
   COLLER UNE IMAGE (Ctrl+V)
   ============================================ */
document.addEventListener('paste', function (e) {
    var items = e.clipboardData && e.clipboardData.items;
    if (!items) return;
    for (var i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
            e.preventDefault();
            var file = items[i].getAsFile();
            if (file) handleFile(file);
            break;
        }
    }
});

/* ============================================
   ACCESSIBILITÉ CLAVIER
   ============================================ */
dropZone.setAttribute('tabindex', '0');
dropZone.setAttribute('role', 'button');
dropZone.setAttribute('aria-label', 'Zone de depot d\'image');
dropZone.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        fileInput.click();
    }
});