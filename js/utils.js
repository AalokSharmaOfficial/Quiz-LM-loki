import { state } from './state.js';
import { dom } from './dom.js';

export const Toast = Swal.mixin({
    target: document.getElementById('quiz-main-container'),
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
    didOpen: (toast) => {
        toast.addEventListener('mouseenter', Swal.stopTimer)
        toast.addEventListener('mouseleave', Swal.resumeTimer)
    }
});

export function playSound(soundElementId) {
    const soundElement = document.getElementById(soundElementId);
    if (!state.isMuted && soundElement && soundElement.play) {
        soundElement.currentTime = 0;
        soundElement.play().catch(e => console.warn(`Audio play error for ${soundElementId}:`, e));
    }
}

export function triggerHapticFeedback(type) {
    if (state.isHapticEnabled && 'vibrate' in navigator) {
        if (type === 'correct') {
            navigator.vibrate(50); // Short buzz for correct
        } else if (type === 'wrong') {
            navigator.vibrate([50, 50, 50]); // Double buzz for wrong
        }
    }
}

export function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

export function buildExplanationHtml(explanationObject) {
    if (!explanationObject || typeof explanationObject !== 'object') {
        return '';
    }
    let html = '';
    const sectionOrder = ['summary', 'analysis_correct', 'analysis_incorrect', 'conclusion', 'fact'];

    sectionOrder.forEach(key => {
        if (explanationObject[key]) {
            html += `<div class="explanation-section explanation-${key}">`;
            html += marked.parse(explanationObject[key]);
            html += `</div>`;
        }
    });
    return html;
}
