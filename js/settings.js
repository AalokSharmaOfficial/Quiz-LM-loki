import { config, state, saveState } from './state.js';
import { dom } from './dom.js';
import { initializeAllFireballs_anim, animateFireballs_anim } from './animations.js';

export function applyInitialSettings() {
    applyTheme();
    applyAnimationSetting();
    updateSoundToggleUI();
    updateShuffleToggleUI();
    updateHapticToggleUI();
}

export function toggleSettings(forceClose = false) {
    if (forceClose) {
        dom.settingsOverlay.classList.remove('visible');
        setTimeout(() => dom.settingsOverlay.style.display = 'none', 300);
    } else {
        const isVisible = dom.settingsOverlay.classList.contains('visible');
        if (isVisible) {
            dom.settingsOverlay.classList.remove('visible');
            setTimeout(() => dom.settingsOverlay.style.display = 'none', 300);
        } else {
            dom.settingsOverlay.style.display = 'flex';
            setTimeout(() => dom.settingsOverlay.classList.add('visible'), 10);
        }
    }
}

export function toggleDarkMode() {
    state.isDarkMode = !state.isDarkMode;
    applyTheme();
    saveState();
}

function applyTheme() {
    document.body.dataset.theme = state.isDarkMode ? 'dark' : 'light';
    if (dom.darkModeToggle) dom.darkModeToggle.checked = state.isDarkMode;
}

export function toggleAnimations() {
    state.animationsDisabled = !state.animationsDisabled;
    applyAnimationSetting();
    saveState();
}

function applyAnimationSetting() {
    document.body.classList.toggle('animations-disabled', state.animationsDisabled);
    if (dom.animationsToggle) dom.animationsToggle.checked = !state.animationsDisabled;
    
    if (!state.animationsDisabled && !state.isAnimating) {
        if (initializeAllFireballs_anim()) {
            state.isAnimating = true;
            animateFireballs_anim();
        }
    } else if (state.animationsDisabled) {
        state.isAnimating = false;
    }
}

export function toggleMute() {
    state.isMuted = !state.isMuted;
    updateSoundToggleUI();
    saveState();
}

function updateSoundToggleUI() {
    if (dom.soundToggle) dom.soundToggle.checked = !state.isMuted;
    if (dom.muteBtnReview) {
        dom.muteBtnReview.innerHTML = state.isMuted ? '<i class="fas fa-volume-mute"></i>' : '<i class="fas fa-volume-up"></i>';
    }
}

export function toggleShuffle() {
    state.callbacks.toggleShuffle(); // This complex logic is kept in quiz.js
}

export function updateShuffleToggleUI() {
    if (dom.shuffleToggle) dom.shuffleToggle.checked = state.isShuffleActive;
}

export function toggleHapticFeedback() {
    state.isHapticEnabled = !state.isHapticEnabled;
    updateHapticToggleUI();
    saveState();
}

function updateHapticToggleUI() {
    if (dom.hapticToggle) dom.hapticToggle.checked = state.isHapticEnabled;
}

export function zoomIn() {
    if (state.currentZoomMultiplier < config.maxZoom) {
        state.currentZoomMultiplier = parseFloat((state.currentZoomMultiplier + config.zoomStep).toFixed(2));
        applyTextZoom();
    }
}

export function zoomOut() {
    if (state.currentZoomMultiplier > config.minZoom) {
        state.currentZoomMultiplier = parseFloat((state.currentZoomMultiplier - config.zoomStep).toFixed(2));
        applyTextZoom();
    }
}

export function applyTextZoom() {
    config.zoomableSelectors.forEach(selector => {
        document.querySelectorAll(selector).forEach(el => {
            if (!state.originalFontSizes.has(el)) {
                const computedStyle = window.getComputedStyle(el);
                state.originalFontSizes.set(el, parseFloat(computedStyle.fontSize));
            }
            const baseSize = state.originalFontSizes.get(el);
            if (baseSize && !isNaN(baseSize)) el.style.fontSize = (baseSize * state.currentZoomMultiplier) + 'px';
        });
    });
    updateZoomButtonStates();
}

function updateZoomButtonStates() {
    const quizZoomIn = document.getElementById('zoom-in-btn');
    const quizZoomOut = document.getElementById('zoom-out-btn');
    const reviewZoomIn = document.getElementById('zoom-in-btn-review');
    const reviewZoomOut = document.getElementById('zoom-out-btn-review');
    if (quizZoomIn) quizZoomIn.disabled = state.currentZoomMultiplier >= config.maxZoom;
    if (quizZoomOut) quizZoomOut.disabled = state.currentZoomMultiplier <= config.minZoom;
    if (reviewZoomIn) reviewZoomIn.disabled = state.currentZoomMultiplier >= config.maxZoom;
    if (reviewZoomOut) reviewZoomOut.disabled = state.currentZoomMultiplier <= config.minZoom;
}

export function toggleFullScreen() {
    const elem = document.getElementById('quiz-main-container');
    if (!document.fullscreenElement) {
        if (elem.requestFullscreen) elem.requestFullscreen();
        else if (elem.webkitRequestFullscreen) elem.webkitRequestFullscreen();
        dom.fullscreenBtn.innerHTML = '<i class="fas fa-compress"></i>';
    } else {
        if (document.exitFullscreen) document.exitFullscreen();
        dom.fullscreenBtn.innerHTML = '<i class="fas fa-expand"></i>';
    }
}

export function showAIExplanation() {
    if (!dom.aiExplanationOverlay) return;
    dom.aiExplanationOverlay.style.display = 'flex';
    setTimeout(() => dom.aiExplanationOverlay.classList.add('visible'), 10);
}

export function hideAIExplanation() {
    if (!dom.aiExplanationOverlay) return;
    dom.aiExplanationOverlay.classList.remove('visible');
    setTimeout(() => dom.aiExplanationOverlay.style.display = 'none', 300);
}
