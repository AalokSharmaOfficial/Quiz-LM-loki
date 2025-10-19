import { config, state } from './state.js';
import { dom } from './dom.js';
import { shuffleArray } from './utils.js';
import { db, initDatabase } from './database.js';

let appCallbacks = {};

export async function initFilterModule(callbacks) {
    appCallbacks = callbacks;
    bindFilterEventListeners();
    try {
        await initializeFilterDataSource();
    } catch (error) {
        console.error("Stopping app initialization due to database error.");
        // The error is already displayed to the user by initDatabase, so we just stop here.
        return;
    }
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

async function initializeFilterDataSource() {
    await initDatabase(); // This handles fetch, progress bar, and populating DB
    
    if (dom.loadingOverlay) {
        dom.loadingOverlay.classList.add('fade-out');
        dom.loadingOverlay.addEventListener('transitionend', () => {
            dom.loadingOverlay.style.display = 'none';
        }, { once: true });
    }
    
    await populateFilterControls();
    await onFilterStateChange();
}


async function populateFilterControls() {
    const unique = {
        subject: await db.questions.orderBy('classification.subject').uniqueKeys(),
        difficulty: await db.questions.orderBy('properties.difficulty').uniqueKeys(),
        questionType: await db.questions.orderBy('properties.questionType').uniqueKeys(),
        examName: await db.questions.orderBy('sourceInfo.examName').uniqueKeys(),
        examYear: (await db.questions.orderBy('sourceInfo.examYear').uniqueKeys()).reverse(),
        tags: await db.questions.orderBy('tags').uniqueKeys()
    };

    populateMultiSelect('subject', unique.subject);

    const topicBtn = dom.filterElements.topic.toggleBtn;
    topicBtn.disabled = true;
    topicBtn.textContent = "Select a Subject first";
    const subTopicBtn = dom.filterElements.subTopic.toggleBtn;
    subTopicBtn.disabled = true;
    subTopicBtn.textContent = "Select a Topic first";

    populateSegmentedControl('difficulty', unique.difficulty);
    populateSegmentedControl('questionType', unique.questionType);
    populateMultiSelect('examName', unique.examName);
    populateMultiSelect('examYear', unique.examYear);
    populateMultiSelect('tags', unique.tags);
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

async function handleSelectionChange(filterKey, value) {
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

    await onFilterStateChange();
}

async function onFilterStateChange() {
    await updateDependentFilters();
    await applyFilters();
    await updateAllFilterCountsAndAvailability();
    updateActiveFiltersSummaryBar();
}

async function updateDependentFilters() {
    const { subject: selectedSubjects, topic: selectedTopics } = state.selectedFilters;
    const { topic: topicElements, subTopic: subTopicElements } = dom.filterElements;

    if (selectedSubjects.length === 0) {
        topicElements.toggleBtn.disabled = true;
        topicElements.toggleBtn.textContent = "Select a Subject first";
        topicElements.list.innerHTML = '';
    } else {
        topicElements.toggleBtn.disabled = false;
        const relevantTopics = await db.questions.where('classification.subject').anyOf(selectedSubjects).uniqueKeys('classification.topic');
        populateMultiSelect('topic', Array.from(relevantTopics).sort());
    }

    if (selectedTopics.length === 0) {
        subTopicElements.toggleBtn.disabled = true;
        subTopicElements.toggleBtn.textContent = "Select a Topic first";
        subTopicElements.list.innerHTML = '';
    } else {
        subTopicElements.toggleBtn.disabled = false;
        const relevantSubTopics = await db.questions.where('classification.subject').anyOf(selectedSubjects).and(q => selectedTopics.includes(q.classification.topic)).uniqueKeys('classification.subTopic');
        populateMultiSelect('subTopic', Array.from(relevantSubTopics).sort());
    }
}

async function applyFilters(filters = state.selectedFilters) {
    let query = db.questions.toCollection();

    if (filters.subject.length > 0) {
        query = query.where('classification.subject').anyOf(filters.subject);
    }
    if (filters.topic.length > 0) {
        query = query.where('classification.topic').anyOf(filters.topic);
    }
    if (filters.subTopic.length > 0) {
        query = query.where('classification.subTopic').anyOf(filters.subTopic);
    }
    if (filters.difficulty.length > 0) {
        query = query.where('properties.difficulty').anyOf(filters.difficulty);
    }
    if (filters.questionType.length > 0) {
        query = query.where('properties.questionType').anyOf(filters.questionType);
    }
    if (filters.examName.length > 0) {
        query = query.where('sourceInfo.examName').anyOf(filters.examName);
    }
    if (filters.examYear.length > 0) {
        query = query.where('sourceInfo.examYear').anyOf(filters.examYear.map(y => parseInt(y, 10)));
    }
    if (filters.tags.length > 0) {
        query = query.where('tags').anyOf(filters.tags);
    }
    
    const filtered = await query.toArray();

    state.filteredQuestionsMasterList = filtered;
    updateQuestionCount();
    return filtered;
}

async function updateAllFilterCountsAndAvailability() {
    for (const filterKey of config.filterKeys) {
        // Build a base query using all *other* active filters.
        let baseQuery = db.questions.toCollection();
        
        for (const otherKey of config.filterKeys) {
            if (otherKey === filterKey) continue; // Skip the current filter key
            const selected = state.selectedFilters[otherKey];
            if (selected.length > 0) {
                const valuePath = getQuestionValuePath(otherKey);
                // Handle year which is a number
                const values = (otherKey === 'examYear') ? selected.map(y => parseInt(y, 10)) : selected;
                baseQuery = baseQuery.where(valuePath).anyOf(values);
            }
        }
        
        // Get all possible unique options for the current filter key, based on the *current* state of other filters.
        const valuePath = getQuestionValuePath(filterKey);
        const allOptionsForThisKey = (await baseQuery.clone().uniqueKeys(valuePath)).filter(Boolean);

        // For each option, clone the base query and get the count.
        const countPromises = allOptionsForThisKey.map(option => {
            const valueForQuery = (filterKey === 'examYear') ? parseInt(String(option), 10) : option;
            return baseQuery.clone().where(valuePath).equals(valueForQuery).count();
        });

        // Await all the count promises to run them in parallel.
        const countsArray = await Promise.all(countPromises);
        
        const counts = {};
        allOptionsForThisKey.forEach((option, index) => {
            counts[option] = countsArray[index];
        });

        // Update the UI with the new counts.
        updateFilterUI(filterKey, counts);
    }
}


function updateFilterUI(filterKey, counts) {
    const { list, segmentedControl } = dom.filterElements[filterKey];
    if (list) {
        list.querySelectorAll('.multiselect-item').forEach(label => {
            const checkbox = label.querySelector('input');
            const value = checkbox.value;
            const count = counts[value] || 0;
            const countSpan = label.querySelector('.filter-option-count');
            if (countSpan) countSpan.textContent = `(${count})`;
            
            // Disable option if it yields 0 results AND is not already selected
            const isDisabled = count === 0 && !checkbox.checked;
            label.classList.toggle('disabled', isDisabled);
            checkbox.disabled = isDisabled;
        });
        updateMultiSelectButtonText(filterKey);
    } else if (segmentedControl) {
        segmentedControl.querySelectorAll('.segmented-btn').forEach(btn => {
            const value = btn.dataset.value;
            const count = counts[value] || 0;
            const countSpan = btn.querySelector('.filter-option-count');
            if (countSpan) countSpan.textContent = `(${count})`;
            btn.classList.toggle('active', state.selectedFilters[filterKey].includes(value));
        });
    }
}

function getQuestionValuePath(filterKey) {
    switch(filterKey) {
        case 'subject': return 'classification.subject';
        case 'topic': return 'classification.topic';
        case 'subTopic': return 'classification.subTopic';
        case 'difficulty': return 'properties.difficulty';
        case 'questionType': return 'properties.questionType';
        case 'examName': return 'sourceInfo.examName';
        case 'examYear': return 'sourceInfo.examYear';
        case 'tags': return 'tags';
        default: return null;
    }
}

function updateQuestionCount() {
    const count = state.filteredQuestionsMasterList.length;
    dom.questionCount.textContent = count;
    dom.startQuizBtn.disabled = count === 0;
}

async function resetFilters() {
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
    await onFilterStateChange();
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
            closeBtn.onclick = async () => {
                // Modifying handleSelectionChange to be async requires this await
                await handleSelectionChange(key, value); 
            };
            
            tag.appendChild(closeBtn);
            dom.activeFiltersSummaryBar.appendChild(tag);
        });
    });
    dom.activeFiltersSummaryBarContainer.style.display = totalSelected > 0 ? 'block' : 'none';
}

async function handleQuickStart(preset) {
    await resetFilters();
    
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
    
    let questions = await applyFilters();
    
    shuffleArray(questions);
    state.filteredQuestionsMasterList = questions.slice(0, 25);
    updateQuestionCount();

    if (state.filteredQuestionsMasterList.length === 0) {
        Swal.fire({
            target: dom.filterSection,
            title: 'No Questions Found', 
            text: 'This quick start preset yielded no questions. Please try another or use the custom filters.', 
            icon: 'warning'
        });
        await resetFilters();
        return;
    }

    startFilteredQuiz();
}