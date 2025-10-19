export const config = {
    questionsPerGroup: 50,
    timePerQuestion: 60,
    zoomStep: 0.1,
    minZoom: 0.7,
    maxZoom: 1.5,
    zoomableSelectors: [
        '.container h1', '.container h2', '.container #review-question-number', '.container #review-time-taken',
        '.container .options button', '.container #explanation', '.container #review-explanation', '.container .summary-item span',
        '.container .question-numbering-area span', '.container #status-tracker', '.container #review-status-tracker',
        'button#next-btn', 'button#restart-btn', 'button#review-btn', 'button#prev-review-btn', 'button#next-review-btn', 'button#back-to-summary-btn'
    ],
    filterKeys: ['subject', 'topic', 'subTopic', 'difficulty', 'questionType', 'examName', 'examYear', 'tags']
};

export let state = {
    allQuestionsMasterList: [],
    filteredQuestionsMasterList: [],
    questionGroups: [],
    currentGroupIndex: 0,
    currentQuizData: null,
    timer: null,
    timeLeftForQuestion: 60,
    currentLifelineUsed: false,
    isMuted: false,
    isShuffleActive: false,
    isDarkMode: false,
    animationsDisabled: false,
    isHapticEnabled: true,
    bookmarkedQuestions: [],
    isAnimating: false,
    isTransitioningQuestion: false,
    isHeaderCollapsed: false,
    currentZoomMultiplier: 1.0,
    originalFontSizes: new Map(),
    fireballs_anim_array: [],
    fireballBaseSpeed_anim: 1.5,
    currentReviewIndex: 0,
    currentReviewFilter: 'all',
    filteredAttempts: [],
    ai: null,
    touchStartX: 0,
    touchStartY: 0,
    isMouseDown: false,
    isQuizActive: false,
    selectedFilters: {
        subject: [], topic: [], subTopic: [], 
        difficulty: [], questionType: [], 
        examName: [], examYear: [], 
        tags: []
    },
    callbacks: {}, // To store callbacks for inter-module communication
};

export function saveState() {
    try {
        const stateToSave = {
            isShuffleActive: state.isShuffleActive,
            isMuted: state.isMuted,
            isDarkMode: state.isDarkMode,
            animationsDisabled: state.animationsDisabled,
            isHapticEnabled: state.isHapticEnabled,
            bookmarkedQuestions: state.bookmarkedQuestions,
            isHeaderCollapsed: state.isHeaderCollapsed,
        };
        localStorage.setItem('ancientHistoryQuizProgress', JSON.stringify(stateToSave));
    } catch (e) {
        console.error("Could not save state to localStorage", e);
    }
}

export function loadState() {
    try {
        const savedStateJSON = localStorage.getItem('ancientHistoryQuizProgress');
        if (savedStateJSON) {
            const savedState = JSON.parse(savedStateJSON);
            
            state.isShuffleActive = savedState.isShuffleActive || false;
            state.isMuted = savedState.isMuted || false;
            state.isDarkMode = savedState.isDarkMode || false;
            state.animationsDisabled = savedState.animationsDisabled || false;
            state.isHapticEnabled = savedState.isHapticEnabled !== false; // Default to true
            state.bookmarkedQuestions = savedState.bookmarkedQuestions || [];
            state.isHeaderCollapsed = savedState.isHeaderCollapsed || false;
        }
    } catch (e) {
        console.error("Could not load state from localStorage", e);
        localStorage.removeItem('ancientHistoryQuizProgress');
    }
}