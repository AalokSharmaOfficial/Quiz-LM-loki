/* ======================================================= */
/* ====== MAIN APP CONTROLLER FOR MODULAR QUIZ APP ======= */
/* ======================================================= */

// Import all modules
import { config, state, loadState, saveState } from './js/state.js';
import { dom, cacheDomElements } from './js/dom.js';
import { Toast } from './js/utils.js';
import { initializeAllFireballs_anim, animateFireballs_anim } from './js/animations.js';
import { 
    applyInitialSettings, 
    toggleSettings, 
    toggleDarkMode, 
    toggleMute, 
    toggleShuffle, 
    toggleAnimations, 
    toggleHapticFeedback,
    zoomIn,
    zoomOut,
    toggleFullScreen,
    hideAIExplanation
} from './js/settings.js';
import { initFilterModule } from './js/filter.js';
import { initQuizModule, loadQuiz } from './js/quiz.js';
import { initReviewModule, showFinalScoreScreen } from './js/review.js';

document.addEventListener('DOMContentLoaded', () => {

    const app = {
        // --- CORE INITIALIZATION ---
        init: async function() {
            cacheDomElements();
            this.loadAndApplyState();
            
            // Initialize modules with necessary callbacks to handle transitions
            const callbacks = {
                startQuiz: this.startQuiz.bind(this),
                endQuiz: this.endQuiz.bind(this),
                restartCurrentGroup: this.restartCurrentGroup.bind(this),
                restartFullQuiz: this.restartFullQuiz.bind(this),
                confirmGoBackToFilters: this.confirmGoBackToFilters.bind(this),
                updateDynamicHeaders: this.updateDynamicHeaders.bind(this),
            };

            initFilterModule(callbacks);
            initQuizModule(callbacks);
            initReviewModule(callbacks);

            this.bindGlobalEventListeners();
            this.startBackgroundAnimations();
        },

        loadAndApplyState: function() {
            loadState();
            applyInitialSettings();
        },

        startBackgroundAnimations: function() {
            if (!state.animationsDisabled) {
                if (initializeAllFireballs_anim()) {
                    state.isAnimating = true;
                    animateFireballs_anim();
                }
            }
        },

        // --- SCREEN TRANSITION HANDLERS ---
        startQuiz: function() {
            state.isQuizActive = true;
            dom.filterSection.style.display = 'none';
            dom.quizMainContainer.style.display = 'block';
            dom.quizBreadcrumbContainer.style.display = 'block';
            loadQuiz();
            this.updateDynamicHeaders();
        },

        endQuiz: function() {
            state.isQuizActive = false;
            dom.quizSection.style.display = 'none';
            dom.reviewSection.style.display = 'none';
            dom.finalScoreSection.style.display = 'block';
            dom.finalScoreSection.classList.add('section-fade-in');
            showFinalScoreScreen();
        },

        restartCurrentGroup: function() {
            // This is handled inside the quiz module, which will re-initialize a group
        },

        restartFullQuiz: function() {
            if (dom.navigationPanel.classList.contains('open')) {
                dom.navigationPanel.classList.remove('open');
                dom.navOverlay.classList.remove('active');
                dom.navMenuIcon.classList.remove('is-active');
            }
        
            document.body.style.overflow = 'auto';
            state.isQuizActive = false;
        
            dom.filterSection.style.display = 'block';
            dom.quizMainContainer.style.display = 'none';
            dom.finalScoreSection.style.display = 'none';
            dom.reviewSection.style.display = 'none';
            dom.quizBreadcrumbContainer.style.display = 'none';
        
            state.questionGroups = [];
            state.currentGroupIndex = 0;
            state.currentQuizData = null;
        },

        confirmGoBackToFilters: function() {
            Swal.fire({
                target: dom.quizMainContainer,
                position: 'top',
                title: 'Return to Filters?',
                text: "Your current quiz progress will be lost. This will start a new quiz session.",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: 'var(--primary-color)',
                cancelButtonColor: 'var(--wrong-color)',
                confirmButtonText: 'Yes, Go Back!'
            }).then((result) => {
                if (result.isConfirmed) {
                    app.restartFullQuiz();
                }
            });
        },
        
        updateDynamicHeaders: function() {
            const groupName = state.currentQuizData?.groupName || "Quiz";

            // Get all active filters from the state
            const activeFilters = [];
            for (const key in state.selectedFilters) {
                if (state.selectedFilters[key] && state.selectedFilters[key].length > 0) {
                    activeFilters.push(...state.selectedFilters[key]);
                }
            }
            
            let filterText = '';
            if (activeFilters.length > 0) {
                // Create the non-clickable, comma-separated list in brackets
                filterText = ` &gt; <span class="breadcrumb-filters">[${activeFilters.join(', ')}]</span>`;
            }

            if (dom.dynamicBreadcrumb) {
                const breadcrumbHtml = `<a href="#" id="breadcrumb-filters-link">Filters</a> &gt; <span class="current-topic">${groupName}</span>${filterText}`;
                dom.dynamicBreadcrumb.innerHTML = breadcrumbHtml;
            }
            
            if (dom.quizTitle) dom.quizTitle.textContent = groupName;
            if (dom.scoreTitle) dom.scoreTitle.textContent = `Quiz Result - ${groupName}`;
            if (dom.reviewTitle) dom.reviewTitle.textContent = `Review Answer - ${groupName}`;
        },

        // --- GLOBAL EVENT BINDING ---
        bindGlobalEventListeners: function() {
            // Settings Panel
            dom.settingsBtn.onclick = () => toggleSettings(false);
            dom.settingsOverlay.onclick = (e) => {
                if (e.target === dom.settingsOverlay) toggleSettings(true);
            };
            dom.settingsCloseBtn.onclick = () => toggleSettings(true);
            dom.darkModeToggle.onchange = () => toggleDarkMode();
            dom.soundToggle.onchange = () => toggleMute();
            dom.shuffleToggle.onchange = () => toggleShuffle();
            dom.animationsToggle.onchange = () => toggleAnimations();
            dom.hapticToggle.onchange = () => toggleHapticFeedback();
            
            // Other global controls
            dom.fullscreenBtn.onclick = () => toggleFullScreen();
            dom.aiExplanationCloseBtn.addEventListener('click', () => hideAIExplanation());
            dom.aiExplanationOverlay.addEventListener('click', (event) => {
                if (event.target === dom.aiExplanationOverlay) {
                    hideAIExplanation();
                }
            });

            // Zoom
            document.getElementById('zoom-in-btn').onclick = () => zoomIn();
            document.getElementById('zoom-out-btn').onclick = () => zoomOut();
            document.getElementById('zoom-in-btn-review').onclick = () => zoomIn();
            document.getElementById('zoom-out-btn-review').onclick = () => zoomOut();
            
            // Before Unload
            window.addEventListener('beforeunload', (event) => {
                if (state.isQuizActive) {
                    event.preventDefault();
                    event.returnValue = '';
                }
            });

            this.addKeyboardListeners();
            this.addSwipeListeners();
        },

        // --- INPUT HANDLERS (KEYBOARD & SWIPE) ---
        handleKeyPress: function(event) {
            if (dom.aiExplanationOverlay && dom.aiExplanationOverlay.classList.contains('visible')) {
                if (event.key === 'Escape') hideAIExplanation();
                return;
            }
            if (dom.navigationPanel && dom.navigationPanel.classList.contains('open')) {
                if (event.key === 'Escape') state.callbacks.toggleQuizInternalNavigation();
                return;
            }
            if (dom.settingsOverlay && dom.settingsOverlay.classList.contains('visible')) {
                if (event.key === 'Escape') toggleSettings(true);
                return;
            }

            const isQuizActive = dom.quizSection.style.display === 'block';
            const isReviewActive = dom.reviewSection.style.display === 'block';
            const isFinalScoreActive = dom.finalScoreSection.style.display === 'block';

            if (isQuizActive) {
                // Call quiz key handlers
                state.callbacks.quizKeyPressHandler(event);
            } else if (isReviewActive) {
                // Call review key handlers
                state.callbacks.reviewKeyPressHandler(event);
            } else if (isFinalScoreActive) {
                // Call score screen key handlers
                state.callbacks.scoreKeyPressHandler(event);
            }
        },

        addKeyboardListeners: function() {
            document.removeEventListener('keydown', this.handleKeyPress);
            document.addEventListener('keydown', this.handleKeyPress.bind(this));
        },

        handleTouchStart: function(event) {
            if (event.target.closest('button, a, #explanation, #review-explanation')) {
                state.touchStartX = 0;
                return;
            }
            state.touchStartX = event.touches[0].clientX;
            state.touchStartY = event.touches[0].clientY;
        },

        handleMouseDown: function(event) {
            if (event.target.closest('button, a, #explanation, #review-explanation')) {
                return;
            }
            state.isMouseDown = true;
            state.touchStartX = event.clientX;
            state.touchStartY = event.clientY;
        },
        
        handleTouchEnd: function(event) {
            if (state.touchStartX === 0) return;
            const touchEndX = event.changedTouches[0].clientX;
            const touchEndY = event.changedTouches[0].clientY;
            this.processSwipe(touchEndX, touchEndY);
        },

        handleMouseUp: function(event) {
            if (!state.isMouseDown) return;
            state.isMouseDown = false;
            const touchEndX = event.clientX;
            const touchEndY = event.clientY;
            this.processSwipe(touchEndX, touchEndY);
        },

        handleMouseLeave: function() {
            if (state.isMouseDown) {
                state.isMouseDown = false;
                state.touchStartX = 0;
                state.touchStartY = 0;
            }
        },
        
        processSwipe: function(touchEndX, touchEndY) {
            if (state.touchStartX === 0) return;

            if (dom.settingsOverlay.classList.contains('visible') || 
                dom.aiExplanationOverlay.classList.contains('visible') ||
                dom.navigationPanel.classList.contains('open')) {
                state.touchStartX = 0;
                state.touchStartY = 0;
                return;
            }

            const deltaX = touchEndX - state.touchStartX;
            const deltaY = touchEndY - state.touchStartY;
            const swipeThreshold = 50;

            if (Math.abs(deltaX) > swipeThreshold && Math.abs(deltaX) > Math.abs(deltaY)) {
                const isQuizActive = dom.quizSection.style.display === 'block';
                const isReviewActive = dom.reviewSection.style.display === 'block';
        
                if (deltaX > 0) { // Swipe Right (Previous)
                    if (isQuizActive && state.callbacks.previousQuestionHandler) state.callbacks.previousQuestionHandler();
                    else if (isReviewActive && state.callbacks.navigateReview) state.callbacks.navigateReview(-1);
                } else { // Swipe Left (Next/Skip)
                    if (isQuizActive && state.callbacks.nextQuestionHandler) state.callbacks.nextQuestionHandler();
                    else if (isReviewActive && state.callbacks.navigateReview) state.callbacks.navigateReview(1);
                }
            }
        
            state.touchStartX = 0;
            state.touchStartY = 0;
        },

        addSwipeListeners: function() {
            const swipeAreas = [dom.quizSection, dom.reviewSection];
            swipeAreas.forEach(area => {
                if(area) {
                    area.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: true });
                    area.addEventListener('touchend', this.handleTouchEnd.bind(this));
                    area.addEventListener('mousedown', this.handleMouseDown.bind(this));
                    area.addEventListener('mouseup', this.handleMouseUp.bind(this));
                    area.addEventListener('mouseleave', this.handleMouseLeave.bind(this));
                }
            });
        }
    };

    app.init();
});