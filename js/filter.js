import { config, state } from './state.js';
import { dom } from './dom.js';
import { shuffleArray } from './utils.js';

let appCallbacks = {};

export function initFilterModule(callbacks) {
    appCallbacks = callbacks;
    bindFilterEventListeners();
    loadQuestionsForFiltering();
    state.callbacks.confirmGoBackToFilters = callbacks.confirmGoBackToFilters;
}

function bindFilterEventListeners() {
    dom.startQuizBtn.onclick = () => startFilteredQuiz();
    dom.resetFiltersBtn.onclick = () => resetFilters();
    dom.quickStartButtons.forEach(btn => {
        btn.onclick = () => handleQuickStart(btn.dataset.preset);
    });

    config.filterKeys.forEach(key => {
        const elements = dom.filterElements[key];
        if (elements.toggleBtn) {
            elements.toggleBtn.onclick = () => toggleMultiSelectDropdown(key);
        }
        if (elements.searchInput) {
            elements.searchInput.oninput = () => filterMultiSelectList(key);
        }
    });

    document.addEventListener('click', (e) => {
        config.filterKeys.forEach(key => {
            if (!dom.filterElements[key] || !dom.filterElements[key].container) return;
            const container = dom.filterElements[key].container;
            if (container && !container.contains(e.target)) {
                toggleMultiSelectDropdown(key, true); // Force close
            }
        });
    });

     if (dom.dynamicBreadcrumb) {
        dom.dynamicBreadcrumb.addEventListener('click', (e) => {
            if (e.target && e.target.id === 'breadcrumb-filters-link') {
                e.preventDefault();
                appCallbacks.confirmGoBackToFilters();
            }
        });
    }
}

async function loadQuestionsForFiltering() {
    try {
        const response = await fetch('./questions.json');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        const contentLength = response.headers.get('Content-Length');
        const total = parseInt(contentLength, 10);
        let loaded = 0;

        // Fallback for servers that don't provide Content-Length or browsers that don't support streams
        if (!total || !response.body) {
            console.warn("Progress bar not supported by this server/browser. Loading questions...");
            if (dom.loadingPercentage) dom.loadingPercentage.textContent = 'Loading...';
            state.allQuestionsMasterList = await response.json();
        } else {
            const reader = response.body.getReader();
            const chunks = [];
            
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                chunks.push(value);
                loaded += value.length;
                const progress = Math.round((loaded / total) * 100);
                
                // Update UI
                if (dom.loadingProgressBar) dom.loadingProgressBar.style.width = `${progress}%`;
                if (dom.loadingPercentage) dom.loadingPercentage.textContent = `${progress}%`;
            }

            // Combine chunks into a single Uint8Array
            const allChunks = new Uint8Array(loaded);
            let position = 0;
            for (const chunk of chunks) {
                allChunks.set(chunk, position);
                position += chunk.length;
            }

            // Decode and parse JSON
            const resultText = new TextDecoder("utf-8").decode(allChunks);
            state.allQuestionsMasterList = JSON.parse(resultText);
        }
        
        if (!state.allQuestionsMasterList || state.allQuestionsMasterList.length === 0) {
            throw new Error(`No questions were found or the file is empty.`);
        }

        // Smoothly hide the loader
        if (dom.loadingOverlay) {
            dom.loadingOverlay.classList.add('fade-out');
            dom.loadingOverlay.addEventListener('transitionend', () => {
                dom.loadingOverlay.style.display = 'none';
            }, { once: true });
        }
        
        populateFilterControls();
        onFilterStateChange();
    } catch (error) {
        console.error(`Could not load quiz questions:`, error);
        if (dom.loadingOverlay) {
            dom.loadingOverlay.innerHTML = `<div class="loader-content"><h1>Error Loading Quiz</h1><p>Could not fetch the questions. Please check your connection and refresh the page.</p><p style="font-size:0.8em; color: var(--text-color-light)">${error.message}</p></div>`;
        }
    }
}

function populateFilterControls() {
    const questions = state.allQuestionsMasterList;
    const unique = {
        subject: new Set(),
        difficulty: new Set(), questionType: new Set(),
        examName: new Set(), examYear: new Set(), tags: new Set()
    };

    questions.forEach(q => {
        if (q.classification?.subject) unique.subject.add(q.classification.subject);
        if (q.properties?.difficulty) unique.difficulty.add(q.properties.difficulty);
        if (q.properties?.questionType) unique.questionType.add(q.properties.questionType);
        if (q.sourceInfo?.examName) unique.examName.add(q.sourceInfo.examName);
        if (q.sourceInfo?.examYear) unique.examYear.add(q.sourceInfo.examYear);
        if (q.tags && Array.isArray(q.tags)) q.tags.forEach(tag => unique.tags.add(tag));
    });

    populateMultiSelect('subject', [...unique.subject].sort());

    const topicBtn = dom.filterElements.topic.toggleBtn;
    topicBtn.disabled = true;
    topicBtn.textContent = "Select a Subject first";
    const subTopicBtn = dom.filterElements.subTopic.toggleBtn;
    subTopicBtn.disabled = true;
    subTopicBtn.textContent = "Select a Topic first";

    populateSegmentedControl('difficulty', [...unique.difficulty].sort());
    populateSegmentedControl('questionType', [...unique.questionType].sort());
    populateMultiSelect('examName', [...unique.examName].sort());
    populateMultiSelect('examYear', [...unique.examYear].sort((a,b) => b-a));
    populateMultiSelect('tags', [...unique.tags].sort());
}

function populateMultiSelect(filterKey, options) {
    const listElement = dom.filterElements[filterKey]?.list;
    if (!listElement) return;

    const selectedValues = state.selectedFilters[filterKey] || [];
    listElement.innerHTML = '';
    options.forEach(opt => {
        const label = document.createElement('label');
        label.className = 'multiselect-item';
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.value = opt;
        checkbox.checked = selectedValues.includes(opt);
        checkbox.onchange = () => handleSelectionChange(filterKey, opt);
        
        const text = document.createElement('span');
        text.textContent = opt;

        const countSpan = document.createElement('span');
        countSpan.className = 'filter-option-count';

        label.appendChild(checkbox);
        label.appendChild(text);
        label.appendChild(countSpan);
        listElement.appendChild(label);
    });
}

function populateSegmentedControl(filterKey, options) {
    const container = dom.filterElements[filterKey]?.segmentedControl;
    if (!container) return;
    container.innerHTML = '';
    options.forEach(opt => {
        const btn = document.createElement('button');
        btn.className = 'segmented-btn';
        btn.dataset.value = opt;
        btn.onclick = () => handleSelectionChange(filterKey, opt);
        
        const text = document.createElement('span');
        text.textContent = opt;
        
        const countSpan = document.createElement('span');
        countSpan.className = 'filter-option-count';

        btn.appendChild(text);
        btn.appendChild(countSpan);
        container.appendChild(btn);
    });
}

function handleSelectionChange(filterKey, value) {
    const selectedValues = state.selectedFilters[filterKey];
    const index = selectedValues.indexOf(value);
    if (index > -1) {
        selectedValues.splice(index, 1);
    } else {
        selectedValues.push(value);
    }

    if (filterKey === 'subject') {
        state.selectedFilters.topic = [];
        state.selectedFilters.subTopic = [];
    } else if (filterKey === 'topic') {
        state.selectedFilters.subTopic = [];
    }

    onFilterStateChange();
}

function onFilterStateChange() {
    updateDependentFilters();
    applyFilters();
    updateAllFilterCountsAndAvailability();
    updateActiveFiltersSummaryBar();
}

function updateDependentFilters() {
    const { subject: selectedSubjects, topic: selectedTopics } = state.selectedFilters;
    const { topic: topicElements, subTopic: subTopicElements } = dom.filterElements;

    if (selectedSubjects.length === 0) {
        topicElements.toggleBtn.disabled = true;
        topicElements.toggleBtn.textContent = "Select a Subject first";
        topicElements.list.innerHTML = '';
    } else {
        topicElements.toggleBtn.disabled = false;
        const relevantTopics = new Set();
        state.allQuestionsMasterList.forEach(q => {
            if (q.classification?.subject && selectedSubjects.includes(q.classification.subject)) {
                if (q.classification?.topic) {
                    relevantTopics.add(q.classification.topic);
                }
            }
        });
        populateMultiSelect('topic', [...relevantTopics].sort());
    }

    if (selectedTopics.length === 0) {
        subTopicElements.toggleBtn.disabled = true;
        subTopicElements.toggleBtn.textContent = "Select a Topic first";
        subTopicElements.list.innerHTML = '';
    } else {
        subTopicElements.toggleBtn.disabled = false;
        const relevantSubTopics = new Set();
        state.allQuestionsMasterList.forEach(q => {
            if (q.classification?.subject && selectedSubjects.includes(q.classification.subject) &&
                q.classification?.topic && selectedTopics.includes(q.classification.topic)) {
                if (q.classification?.subTopic) {
                    relevantSubTopics.add(q.classification.subTopic);
                }
            }
        });
        populateMultiSelect('subTopic', [...relevantSubTopics].sort());
    }
}

function applyFilters(questionList = state.allQuestionsMasterList, filters = state.selectedFilters) {
    const checkCategory = (questionValue, selectedValues) => {
        if (selectedValues.length === 0) return true;
        if (questionValue === null || questionValue === undefined) return false; 
        if (Array.isArray(questionValue)) {
            return questionValue.some(val => selectedValues.includes(val));
        }
        return selectedValues.includes(questionValue);
    };

    const filtered = questionList.filter(q => 
        checkCategory(q.classification?.subject, filters.subject) &&
        checkCategory(q.classification?.topic, filters.topic) &&
        checkCategory(q.classification?.subTopic, filters.subTopic) &&
        checkCategory(q.properties?.difficulty, filters.difficulty) &&
        checkCategory(q.properties?.questionType, filters.questionType) &&
        checkCategory(q.sourceInfo?.examName, filters.examName) &&
        checkCategory(q.sourceInfo?.examYear, filters.examYear) &&
        checkCategory(q.tags, filters.tags)
    );

    if (filters === state.selectedFilters) {
        state.filteredQuestionsMasterList = filtered;
        updateQuestionCount();
    }
    return filtered;
}

function updateAllFilterCountsAndAvailability() {
    config.filterKeys.forEach(filterKey => {
        const tempFilters = JSON.parse(JSON.stringify(state.selectedFilters));
        tempFilters[filterKey] = [];
        const contextualList = applyFilters(state.allQuestionsMasterList, tempFilters);

        const counts = {};
        contextualList.forEach(q => {
            const value = getQuestionValue(q, filterKey);
            if (Array.isArray(value)) {
                value.forEach(v => { counts[v] = (counts[v] || 0) + 1; });
            } else if (value) {
                counts[value] = (counts[value] || 0) + 1;
            }
        });

        updateFilterUI(filterKey, counts);
    });
}

function updateFilterUI(filterKey, counts) {
    const { list, segmentedControl } = dom.filterElements[filterKey];
    if (list) {
        list.querySelectorAll('.multiselect-item').forEach(label => {
            const checkbox = label.querySelector('input');
            const value = checkbox.value;
            const count = counts[value] || 0;
            label.querySelector('.filter-option-count').textContent = `(${count})`;
            const isDisabled = count === 0 && !checkbox.checked;
            label.classList.toggle('disabled', isDisabled);
            checkbox.disabled = isDisabled;
        });
        updateMultiSelectButtonText(filterKey);
    } else if (segmentedControl) {
        segmentedControl.querySelectorAll('.segmented-btn').forEach(btn => {
            const value = btn.dataset.value;
            const count = counts[value] || 0;
            btn.querySelector('.filter-option-count').textContent = `(${count})`;
            btn.classList.toggle('active', state.selectedFilters[filterKey].includes(value));
        });
    }
}

function getQuestionValue(q, filterKey) {
    switch(filterKey) {
        case 'subject': return q.classification?.subject;
        case 'topic': return q.classification?.topic;
        case 'subTopic': return q.classification?.subTopic;
        case 'difficulty': return q.properties?.difficulty;
        case 'questionType': return q.properties?.questionType;
        case 'examName': return q.sourceInfo?.examName;
        case 'examYear': return q.sourceInfo?.examYear;
        case 'tags': return q.tags;
        default: return null;
    }
}

function updateQuestionCount() {
    const count = state.filteredQuestionsMasterList.length;
    dom.questionCount.textContent = count;
    dom.startQuizBtn.disabled = count === 0;
}

function resetFilters() {
    state.selectedFilters = {
        subject: [], topic: [], subTopic: [], 
        difficulty: [], questionType: [], 
        examName: [], examYear: [], 
        tags: []
    };
    config.filterKeys.forEach(key => {
         if (!dom.filterElements[key]) return;
         const elements = dom.filterElements[key];
         if (elements.list) {
             elements.list.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
         }
         if(elements.searchInput) elements.searchInput.value = '';
         filterMultiSelectList(key);
    });
    onFilterStateChange();
}

function startFilteredQuiz() {
    if (state.filteredQuestionsMasterList.length === 0) {
        Swal.fire('No Questions Found', 'Please adjust your filters to select at least one question.', 'warning');
        return;
    }
    appCallbacks.startQuiz();
}

function toggleMultiSelectDropdown(filterKey, forceClose = false) {
    const dropdown = dom.filterElements[filterKey]?.dropdown;
    if (!dropdown) return;
    const isVisible = dropdown.style.display === 'flex';
    if (forceClose) {
        dropdown.style.display = 'none';
    } else {
        dropdown.style.display = isVisible ? 'none' : 'flex';
    }
}

function filterMultiSelectList(filterKey) {
    const elements = dom.filterElements[filterKey];
    if (!elements || !elements.searchInput || !elements.list) return;

    const searchTerm = elements.searchInput.value.toLowerCase();
    elements.list.querySelectorAll('.multiselect-item').forEach(label => {
        const itemText = label.querySelector('span:not(.filter-option-count)').textContent.trim().toLowerCase();
        label.style.display = itemText.includes(searchTerm) ? 'flex' : 'none';
    });
}

function updateMultiSelectButtonText(filterKey) {
    const toggleBtn = dom.filterElements[filterKey]?.toggleBtn;
    if (!toggleBtn || toggleBtn.disabled) return;

    const selected = state.selectedFilters[filterKey] || [];
    const count = selected.length;
    const labelText = dom.filterElements[filterKey].container.previousElementSibling.textContent;

    if (count === 0) {
        let plural = labelText.endsWith('s') ? labelText : labelText + 's';
        toggleBtn.textContent = `Select ${plural}`;
    } else if (count === 1) {
        toggleBtn.textContent = selected[0];
    } else {
        let plural = labelText.endsWith('s') ? labelText : labelText + 's';
        toggleBtn.textContent = `${count} ${plural} Selected`;
    }
}

function updateActiveFiltersSummaryBar() {
    dom.activeFiltersSummaryBar.innerHTML = '';
    let totalSelected = 0;
    config.filterKeys.forEach(key => {
        const selected = state.selectedFilters[key] || [];
        totalSelected += selected.length;
        selected.forEach(value => {
            const tag = document.createElement('span');
            tag.className = 'filter-tag';
            tag.textContent = value;
            
            const closeBtn = document.createElement('button');
            closeBtn.className = 'tag-close-btn';
            closeBtn.innerHTML = '&times;';
            closeBtn.setAttribute('aria-label', `Remove ${value} filter`);
            closeBtn.onclick = () => handleSelectionChange(key, value);
            
            tag.appendChild(closeBtn);
            dom.activeFiltersSummaryBar.appendChild(tag);
        });
    });
    dom.activeFiltersSummaryBarContainer.style.display = totalSelected > 0 ? 'block' : 'none';
}

function handleQuickStart(preset) {
    resetFilters();
    
    switch(preset) {
        case 'quick_25_easy':
            state.selectedFilters.difficulty = ['Easy'];
            break;
        case 'quick_25_moderate':
            state.selectedFilters.difficulty = ['Medium'];
            break;
        case 'quick_25_hard':
            state.selectedFilters.difficulty = ['Hard'];
            break;
        case 'quick_25_mix':
            // No filter applied, will use all questions
            break;
    }
    applyFilters();
    
    shuffleArray(state.filteredQuestionsMasterList);
    state.filteredQuestionsMasterList = state.filteredQuestionsMasterList.slice(0, 25);

    if (state.filteredQuestionsMasterList.length === 0) {
        Swal.fire({
            target: dom.filterSection,
            title: 'No Questions Found', 
            text: 'This quick start preset yielded no questions. Please try another or use the custom filters.', 
            icon: 'warning'
        });
        resetFilters();
        return;
    }

    startFilteredQuiz();
}