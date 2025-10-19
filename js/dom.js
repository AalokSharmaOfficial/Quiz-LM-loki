export let dom = {
    filterElements: {},
    tagContainers: {}
};

export function cacheDomElements() {
    // Loading Overlay
    dom.loadingOverlay = document.getElementById('loading-overlay');
    dom.loadingProgressBar = document.getElementById('loading-progress-bar');
    dom.loadingPercentage = document.getElementById('loading-percentage');

    // Filter Section
    dom.filterSection = document.getElementById('filter-section');
    const filterKeys = ['subject', 'topic', 'subTopic', 'difficulty', 'questionType', 'examName', 'examYear', 'tags'];
    filterKeys.forEach(key => {
        dom.filterElements[key] = {
            container: document.getElementById(`${key}-multiselect-container`),
            toggleBtn: document.getElementById(`${key}-toggle-btn`),
            dropdown: document.getElementById(`${key}-dropdown`),
            searchInput: document.getElementById(`${key}-search-input`),
            list: document.getElementById(`${key}-list`),
            segmentedControl: document.getElementById(`${key}-segmented-control`),
        };
    });
    dom.startQuizBtn = document.getElementById('start-quiz-btn');
    dom.resetFiltersBtn = document.getElementById('reset-filters-btn');
    dom.questionCount = document.getElementById('question-count');
    dom.quickStartButtons = document.querySelectorAll('.quick-start-btn');
    dom.activeFiltersSummaryBarContainer = document.getElementById('active-filters-summary-bar-container');
    dom.activeFiltersSummaryBar = document.getElementById('active-filters-summary-bar');

    // Quiz Section
    dom.quizMainContainer = document.getElementById("quiz-main-container");
    dom.quizBreadcrumbContainer = document.querySelector('.quiz-breadcrumb-container');
    dom.quizContainer = document.getElementById("quiz-container");
    dom.quizProgressBar = document.getElementById('quiz-progress-bar');
    dom.timerDisplay = document.getElementById("time-left");
    dom.timerElement = document.getElementById('timer');
    dom.timerBar = document.getElementById('timer-bar');
    dom.statusTrackerEl = document.getElementById("status-tracker");
    dom.questionTextEl = document.getElementById("question-text");
    dom.optionsEl = document.getElementById("options");
    dom.nextBtn = document.getElementById("next-btn");
    dom.explanationEl = document.getElementById("explanation");
    dom.sequentialQuestionNumberEl = document.getElementById("sequential-question-number");
    dom.actualQuestionNumberEl = document.getElementById("actual-question-number");
    dom.examNameTag = document.getElementById('exam-name-tag');
    dom.examDateShiftTag = document.getElementById('exam-date-shift-tag');
    dom.timeoutOverlay = document.getElementById("timeout-overlay");
    dom.lifelineBtn = document.getElementById("lifeline-btn");
    dom.quizSection = document.getElementById("quiz-section");
    dom.finalScoreSection = document.getElementById("final-score-section");
    dom.reviewSection = document.getElementById("review-section");
    dom.scoreSummaryListEl = document.getElementById("score-summary-list");
    dom.reviewQuestionNumberEl = document.getElementById("review-question-number");
    dom.reviewTimeTakenEl = document.getElementById("review-time-taken");
    dom.reviewQuestionTextEl = document.getElementById("review-question-text");
    dom.reviewOptionsEl = document.getElementById("review-options");
    dom.reviewExplanationEl = document.getElementById("review-explanation");
    dom.reviewStatusTrackerEl = document.getElementById("review-status-tracker");
    dom.prevReviewBtn = document.getElementById("prev-review-btn");
    dom.nextReviewBtn = document.getElementById("next-review-btn");
    dom.backToSummaryBtn = document.getElementById("back-to-summary-btn");
    dom.muteBtnReview = document.getElementById("mute-btn-review");
    dom.correctSound = document.getElementById("correct-sound");
    dom.wrongSound = document.getElementById("wrong-sound");
    dom.navMenuIcon = document.getElementById('nav-menu-icon');
    dom.navigationPanel = document.getElementById('navigation-panel');
    dom.navOverlay = document.getElementById('nav-overlay');
    dom.restartFullQuizBtn = document.getElementById('restart-full-quiz-btn');
    dom.restartBtn = document.getElementById('restart-btn');
    dom.reviewBtn = document.getElementById('review-btn');
    dom.aiExplainerBtn = document.getElementById('ai-explainer-btn');
    dom.aiExplanationOverlay = document.getElementById('ai-explanation-overlay');
    dom.aiExplanationCloseBtn = document.getElementById('ai-explanation-close-btn');
    dom.aiExplanationBody = document.getElementById('ai-explanation-body');
    dom.fullscreenBtn = document.getElementById('fullscreen-btn');
    dom.quizNavBar = document.getElementById('quiz-nav-bar');
    dom.prevQuestionBtn = document.getElementById('prev-question-btn');
    dom.nextQuestionBtn = document.getElementById('next-question-btn');
    dom.markReviewBtn = document.getElementById('mark-review-btn');
    dom.shareResultsBtn = document.getElementById('share-results-btn');
    dom.scoreVisualsContainer = document.getElementById('score-visuals-container');
    dom.donutChartContainer = document.getElementById('score-donut-chart-container');
    dom.accuracyProgressBar = document.getElementById('accuracy-progress-bar');
    dom.completionProgressBar = document.getElementById('completion-progress-bar');
    dom.accuracyPercentage = document.getElementById('accuracy-percentage');
    dom.completionPercentage = document.getElementById('completion-percentage');
    
    // Collapsible Header
    dom.quizHeaderBar = document.querySelector('.quiz-header-bar');
    dom.toggleHeaderBtn = document.getElementById('toggle-header-btn');
    dom.collapsibleHeaderContent = document.getElementById('collapsible-header-content');
    
    // Settings & Bookmarks
    dom.settingsBtn = document.getElementById('settings-btn');
    dom.settingsOverlay = document.getElementById('settings-overlay');
    dom.settingsPanel = document.getElementById('settings-panel');
    dom.settingsCloseBtn = document.getElementById('settings-close-btn');
    dom.darkModeToggle = document.getElementById('dark-mode-toggle');
    dom.soundToggle = document.getElementById('sound-toggle');
    dom.shuffleToggle = document.getElementById('shuffle-toggle');
    dom.animationsToggle = document.getElementById('animations-toggle');
    dom.hapticToggle = document.getElementById('haptic-toggle');
    dom.bookmarkBtn = document.getElementById('bookmark-btn');

    // Dynamic Headers
    dom.dynamicBreadcrumb = document.getElementById('dynamic-breadcrumb');
    dom.quizTitle = document.getElementById('quiz-title');
    dom.scoreTitle = document.getElementById('score-title');
    dom.reviewTitle = document.getElementById('review-title');
}