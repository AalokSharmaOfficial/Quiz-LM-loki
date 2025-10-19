import { state } from './state.js';
import { dom } from './dom.js';
import { buildExplanationHtml, Toast } from './utils.js';
import { applyTextZoom } from './settings.js';

let appCallbacks = {};

export function initReviewModule(callbacks) {
    appCallbacks = callbacks;
    state.callbacks.reviewKeyPressHandler = handleKeyPress;
    state.callbacks.scoreKeyPressHandler = handleScoreKeyPress;
    state.callbacks.navigateReview = navigateReview;
    bindReviewEventListeners();
}

function bindReviewEventListeners() {
    dom.reviewBtn.onclick = () => startReview();
    dom.restartBtn.onclick = () => confirmAndRestartCurrentGroup();
    dom.restartFullQuizBtn.onclick = () => confirmRestartFullQuiz();
    dom.shareResultsBtn.onclick = () => shareResults();

    document.querySelectorAll('.filter-btn').forEach(button => {
        button.addEventListener('click', (e) => setReviewFilter(e.target.dataset.filter));
    });

    dom.prevReviewBtn.onclick = () => navigateReview(-1);
    dom.nextReviewBtn.onclick = () => navigateReview(1);
    dom.backToSummaryBtn.onclick = () => showFinalScoreScreen();
}

export function showFinalScoreScreen() {
    state.originalFontSizes.clear();

    const cd = state.currentQuizData;
    if (!cd) {
        console.error("showFinalScoreScreen called without currentQuizData.");
        appCallbacks.restartFullQuiz(); // Go back to a safe state
        return;
    }
    const totalQuestionsInCurrentPart = cd.questions.length;
    const correctCount = cd.attempts.filter(a => a.status === 'Correct').length;
    const wrongCount = cd.attempts.filter(a => a.status === 'Wrong').length;
    const timedOutCount = cd.attempts.filter(a => a.status === 'Timeout').length;
    const attemptedQuestions = correctCount + wrongCount + timedOutCount;
    let unattempted = totalQuestionsInCurrentPart - attemptedQuestions;
    unattempted = Math.max(0, unattempted);
    let accuracy = (attemptedQuestions > 0) ? ((correctCount / attemptedQuestions) * 100).toFixed(1) : "0.0";

    const remark = getScoreRemark(accuracy);
    document.getElementById('score-remark').innerHTML = `<p class="${remark.class}">${remark.text}</p>`;

    renderScoreVisuals(correctCount, wrongCount, timedOutCount, unattempted, accuracy, totalQuestionsInCurrentPart, attemptedQuestions);

    dom.scoreSummaryListEl.innerHTML = ` 
        <div class="summary-item"><span>Current Group:</span> <span>${cd.groupName}</span></div>
        <div class="summary-item"><span>Total Qs in Group:</span> <span>${totalQuestionsInCurrentPart}</span></div> 
        <div class="summary-item"><span>Attempted:</span> <span>${attemptedQuestions}</span></div> 
        <div class="summary-item"><span>Correct ✅:</span> <span>${correctCount}</span></div> 
        <div class="summary-item"><span>Wrong ❌:</span> <span>${wrongCount}</span></div> 
        <div class="summary-item"><span>Timeout ⏱️:</span> <span>${timedOutCount}</span></div> 
        <div class="summary-item"><span>Unattempted:</span> <span>${unattempted}</span></div> 
        <div class="summary-item accuracy-item"><span>Accuracy:</span> <span>${accuracy}%</span></div>`;
    
    dom.reviewBtn.disabled = cd.attempts.length === 0;

    const scoreContainer = dom.finalScoreSection.querySelector('.final-score-container');
    if (scoreContainer) {
        scoreContainer.style.opacity = 0;
        scoreContainer.style.transform = 'scale(0.95)';
        setTimeout(() => {
            scoreContainer.style.transition = 'opacity 0.5s ease-out, transform 0.5s ease-out';
            scoreContainer.style.opacity = 1;
            scoreContainer.style.transform = 'scale(1)';
        }, 100);
    }
    applyTextZoom();
}

function getScoreRemark(accuracy) {
    accuracy = parseFloat(accuracy);
    if (accuracy >= 95) return { text: "Outstanding! 🏆 You're a true master of this topic!", class: 'remark-a1' };
    if (accuracy >= 90) return { text: "Excellent Work! 🧠 You have a superb understanding.", class: 'remark-a2' };
    if (accuracy >= 80) return { text: "Great Job! 👍 You're well on your way to mastery.", class: 'remark-b1' };
    if (accuracy >= 60) return { text: "Good Effort! 📚 Keep practicing to solidify your knowledge.", class: 'remark-b2' };
    if (accuracy >= 40) return { text: "Keep Going! 💪 Every review is a step toward success.", class: 'remark-c' };
    return { text: "Don't Give Up! 🌱 The first step to learning is trying.", class: 'remark-d' };
}

function renderScoreVisuals(correct, wrong, timeout, skipped, accuracy, total, attempted) {
    dom.donutChartContainer.innerHTML = ''; // Clear previous chart
    const wrongAndTimeout = wrong + timeout;
    const totalForChart = correct + wrongAndTimeout + skipped;
    if (totalForChart === 0) return;

    const correctPercent = (correct / totalForChart) * 100;
    const wrongPercent = (wrongAndTimeout / totalForChart) * 100;
    const skippedPercent = 100 - correctPercent - wrongPercent;
    const accuracyRate = parseFloat(accuracy);
    const completionRate = (attempted / total) * 100;

    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute('viewBox', '0 0 60 60');
    svg.classList.add('score-donut-chart');
    const radius = 25;
    const circumference = 2 * Math.PI * radius;
    let cumulativeRotation = 0;

    const createSegment = (percentage, className) => {
        if (percentage <= 0) return null;
        const segment = document.createElementNS(svgNS, "circle");
        segment.classList.add('donut-segment', className);
        segment.setAttribute('cx', '30');
        segment.setAttribute('cy', '30');
        segment.setAttribute('r', radius);
        segment.setAttribute('stroke-dasharray', circumference);
        segment.setAttribute('transform', `rotate(${cumulativeRotation} 30 30)`);
        const segmentLength = (percentage / 100) * circumference;
        segment.style.strokeDashoffset = circumference;
        setTimeout(() => { segment.style.strokeDashoffset = circumference - segmentLength; }, 100);
        cumulativeRotation += percentage * 3.6;
        return segment;
    };

    const correctSegment = createSegment(correctPercent, 'donut-segment-correct');
    const wrongSegment = createSegment(wrongPercent, 'donut-segment-wrong');
    const skippedSegment = createSegment(skippedPercent, 'donut-segment-skipped');

    if (skippedSegment) svg.appendChild(skippedSegment);
    if (wrongSegment) svg.appendChild(wrongSegment);
    if (correctSegment) svg.appendChild(correctSegment);

    const centerText = document.createElement('div');
    centerText.className = 'donut-chart-center-text';
    centerText.textContent = `${Math.round(accuracyRate)}%`;

    dom.donutChartContainer.appendChild(svg);
    dom.donutChartContainer.appendChild(centerText);

    setTimeout(() => {
        dom.accuracyProgressBar.style.width = `${accuracyRate}%`;
        dom.completionProgressBar.style.width = `${completionRate}%`;
        dom.accuracyPercentage.textContent = `${accuracyRate.toFixed(1)}%`;
        dom.completionPercentage.textContent = `${Math.round(completionRate)}%`;
    }, 100);
}

function startReview() {
    if (!state.currentQuizData || state.currentQuizData.attempts.length === 0) {
        Toast.fire({ icon: 'info', title: 'No questions attempted yet to review!' });
        return;
    }

    dom.quizSection.style.display = 'none';
    dom.finalScoreSection.style.display = 'none';
    dom.reviewSection.style.display = 'block';
    dom.reviewSection.classList.add('section-fade-in');

    setReviewFilter('all');
    setReviewStatusTracker();
    state.originalFontSizes.clear();
}

function setReviewFilter(filterType) {
    if (!state.currentQuizData) return;
    state.currentReviewFilter = filterType;
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.filter === filterType) btn.classList.add('active');
    });

    const allAttempts = state.currentQuizData.attempts;
    switch (filterType) {
        case 'correct': state.filteredAttempts = allAttempts.filter(a => a.status === 'Correct'); break;
        case 'wrong': state.filteredAttempts = allAttempts.filter(a => a.status === 'Wrong' || a.status === 'Timeout'); break;
        case 'skipped': state.filteredAttempts = allAttempts.filter(a => a.status === 'Skipped'); break;
        case 'bookmarked': state.filteredAttempts = allAttempts.filter(a => state.bookmarkedQuestions.includes(a.questionId)); break;
        default: state.filteredAttempts = [...allAttempts]; break;
    }
    state.currentReviewIndex = 0;
    if (state.filteredAttempts.length > 0) {
        displayReviewQuestion(state.currentReviewIndex);
    } else {
        dom.reviewQuestionTextEl.innerHTML = `<h2>No questions match the filter "${filterType}".</h2>`;
        dom.reviewOptionsEl.innerHTML = '';
        dom.reviewExplanationEl.style.display = 'none';
        dom.reviewQuestionNumberEl.innerText = 'Reviewing (0/0)';
        dom.prevReviewBtn.disabled = true;
        dom.nextReviewBtn.disabled = true;
    }
}

function displayReviewQuestion(index) {
    if (!state.currentQuizData || index < 0 || index >= state.filteredAttempts.length) return;

    const attempt = state.filteredAttempts[index];
    state.originalFontSizes.clear();

    dom.reviewQuestionNumberEl.innerText = `Reviewing ${state.currentReviewFilter} (${index + 1}/${state.filteredAttempts.length}) | Actual ID: ${attempt.questionId}`;

    if (attempt.status === 'Skipped') {
        dom.reviewTimeTakenEl.innerText = `(Not Attempted)`;
        dom.reviewTimeTakenEl.style.display = 'inline-block';
    } else if (attempt.timeTaken !== undefined) {
        dom.reviewTimeTakenEl.innerText = `(Time Taken: ${attempt.timeTaken.toFixed(1)}s)`;
        dom.reviewTimeTakenEl.style.display = 'inline-block';
    } else {
        dom.reviewTimeTakenEl.style.display = 'none';
    }

    dom.reviewQuestionTextEl.innerHTML = `${attempt.question || ""}${attempt.question_hi ? '<hr class="lang-separator"><span class="hindi-text">' + attempt.question_hi + '</span>' : ''}`;
    dom.reviewOptionsEl.innerHTML = "";

    const displayedOptionsBilingual = attempt.optionsDisplayedBilingual || [];
    displayedOptionsBilingual.forEach(optData => {
        const btn = document.createElement("button");
        btn.innerHTML = `${optData.eng}${optData.hin ? '<br><span class="hindi-text">' + optData.hin + '</span>' : ''}`;
        btn.disabled = true;
        const feedbackIcon = document.createElement('span');
        feedbackIcon.classList.add('icon-feedback');
        let iconAdded = false;

        if (optData.eng.trim() === attempt.correct.trim()) {
            btn.classList.add("review-correct");
            feedbackIcon.innerHTML = "✔️";
            btn.appendChild(feedbackIcon.cloneNode(true));
            iconAdded = true;
        }
        if (attempt.selected && attempt.selected !== "Timed Out" && attempt.selected !== "Skipped" && optData.eng.trim() === attempt.selected.trim()) {
            btn.classList.add("review-selected");
            if (attempt.status === "Wrong") {
                btn.classList.add("review-wrong-selected");
                if (!iconAdded) {
                    feedbackIcon.innerHTML = "❌";
                    btn.appendChild(feedbackIcon.cloneNode(true));
                }
            }
        }
        dom.reviewOptionsEl.appendChild(btn);
    });

    dom.reviewExplanationEl.innerHTML = buildExplanationHtml(attempt.explanation);
    dom.reviewExplanationEl.style.display = "block";

    dom.prevReviewBtn.disabled = (index === 0);
    dom.nextReviewBtn.disabled = (index === state.filteredAttempts.length - 1);
    applyTextZoom();
}

function navigateReview(direction) {
    if (!state.currentQuizData || state.filteredAttempts.length === 0) return;
    const newIndex = state.currentReviewIndex + direction;
    if (newIndex >= 0 && newIndex < state.filteredAttempts.length) {
        state.currentReviewIndex = newIndex;
        displayReviewQuestion(state.currentReviewIndex);
    }
}

function setReviewStatusTracker() {
    if (!dom.reviewStatusTrackerEl || !state.currentQuizData) return;
    const cd = state.currentQuizData;
    const correctCount = cd.attempts.filter(a => a.status === 'Correct').length;
    const wrongCount = cd.attempts.filter(a => a.status !== 'Correct').length;
    dom.reviewStatusTrackerEl.innerHTML = `<span>✅ Correct: ${correctCount}</span> | <span>❌ Wrong/Skipped: ${wrongCount}</span> | <span>Total Attempted: ${cd.attempts.length}</span>`;
}

async function shareResults() {
    const scoreContainer = dom.finalScoreSection.querySelector('.final-score-container');
    if (!navigator.share) {
        Toast.fire({ icon: 'error', title: 'Sharing is not supported on this browser.' });
        return;
    }
    Toast.fire({ icon: 'info', title: 'Generating your result image...' });

    try {
        const canvas = await html2canvas(scoreContainer, {
            useCORS: true,
            backgroundColor: getComputedStyle(document.body).getPropertyValue('--background-gradient-start')
        });
        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
        if (!blob) throw new Error('Failed to create blob from canvas');
        
        const file = new File([blob], 'quiz-result.png', { type: 'image/png' });
        const cd = state.currentQuizData;
        const totalQuestions = cd.questions.length;
        const correctCount = cd.attempts.filter(a => a.status === 'Correct').length;
        const shareText = `I just scored ${correctCount}/${totalQuestions} on the CGL Hustle Quiz 🧠✨. Can you beat my score?`;
        
        await navigator.share({
            title: 'My Quiz Result!',
            text: shareText,
            url: window.location.href,
            files: [file]
        });
    } catch (error) {
        console.error('Sharing failed:', error);
        Toast.fire({ icon: 'error', title: 'Could not share results.' });
    }
}

function confirmAndRestartCurrentGroup() {
    Swal.fire({
        target: dom.quizMainContainer,
        position: 'top',
        title: 'Restart this group?',
        text: `Your progress for "${state.currentQuizData.groupName}" will be be lost!`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: 'var(--primary-color)',
        cancelButtonColor: 'var(--wrong-color)',
        confirmButtonText: 'Yes, restart it!'
    }).then((result) => {
        if (result.isConfirmed) {
            appCallbacks.restartCurrentGroup();
        }
    });
}

function confirmRestartFullQuiz() {
    Swal.fire({
        target: dom.quizMainContainer,
        position: 'top',
        title: 'Start a new quiz?',
        text: "You'll be taken back to the filter screen.",
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: 'var(--primary-color)',
        cancelButtonColor: 'var(--wrong-color)',
        confirmButtonText: 'Yes, start new!'
    }).then((result) => {
        if (result.isConfirmed) {
            appCallbacks.restartFullQuiz();
        }
    });
}

function handleKeyPress(event) {
    if (event.key === 'ArrowLeft') {
        if (dom.prevReviewBtn && !dom.prevReviewBtn.disabled) navigateReview(-1);
    } else if (event.key === 'ArrowRight') {
        if (dom.nextReviewBtn && !dom.nextReviewBtn.disabled) navigateReview(1);
    } else if (event.key === 'Escape' || event.key.toLowerCase() === 'b') {
        showFinalScoreScreen();
    }
}

function handleScoreKeyPress(event) {
    if (event.key.toLowerCase() === 'r') {
        if (dom.reviewBtn && !dom.reviewBtn.disabled) startReview();
    } else if (event.key.toLowerCase() === 'c') {
        confirmAndRestartCurrentGroup();
    } else if (event.key.toLowerCase() === 'f') {
        confirmRestartFullQuiz();
    }
}