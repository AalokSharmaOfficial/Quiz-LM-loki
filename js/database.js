import { dom } from './dom.js';

// --- DATABASE VERSION ---
// IMPORTANT: Increment this version number every time you update questions.json
export const DB_VERSION = '1.0';

// --- DEXIE SETUP ---
// Create a new Dexie database instance named 'QuizDB'.
export const db = new Dexie('QuizDB');

// Define the database schema. This specifies tables and their indexes.
// 'id' is the primary key. Other fields are indexed for fast querying.
// '*tags' creates a multi-entry index for the tags array.
db.version(1).stores({
    questions: 'id, classification.subject, classification.topic, classification.subTopic, properties.difficulty, properties.questionType, sourceInfo.examName, sourceInfo.examYear, *tags'
});

/**
 * Initializes the database. Checks if the data is present and up-to-date.
 * If not, it fetches questions.json and populates the database.
 */
export async function initDatabase() {
    const currentVersion = localStorage.getItem('databaseVersion');
    
    // If the version matches and the DB has questions, we're good to go.
    if (currentVersion === DB_VERSION && (await db.questions.count()) > 0) {
        console.log('Database is up to date.');
        return;
    }

    console.log('Database needs population or update. Current version:', currentVersion, 'Required version:', DB_VERSION);
    
    // Update loading text for first-time setup
    const loadingText = document.getElementById('loading-text');
    if (loadingText) {
        loadingText.textContent = 'Preparing question database for first-time use. This may take a moment...';
    }

    try {
        // Clear old data if the version is different
        if (currentVersion !== DB_VERSION) {
            await db.questions.clear();
            console.log('Cleared old questions for update.');
        }

        const response = await fetch('./questions.json');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        // Handle progress bar for the download
        const contentLength = response.headers.get('Content-Length');
        const total = parseInt(contentLength, 10);
        let loaded = 0;

        if (!total || !response.body) {
            // Fallback for servers that don't provide Content-Length
            if (dom.loadingPercentage) dom.loadingPercentage.textContent = 'Loading...';
            const allQuestions = await response.json();
            await db.questions.bulkAdd(allQuestions);
        } else {
            const reader = response.body.getReader();
            const chunks = [];
            
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                chunks.push(value);
                loaded += value.length;
                const progress = Math.round((loaded / total) * 100);
                
                if (dom.loadingProgressBar) dom.loadingProgressBar.style.width = `${progress}%`;
                if (dom.loadingPercentage) dom.loadingPercentage.textContent = `${progress}%`;
            }

            const allChunks = new Uint8Array(loaded);
            let position = 0;
            for (const chunk of chunks) {
                allChunks.set(chunk, position);
                position += chunk.length;
            }

            const resultText = new TextDecoder("utf-8").decode(allChunks);
            const allQuestions = JSON.parse(resultText);
            
            // Use Dexie's efficient bulkAdd to populate the database
            await db.questions.bulkAdd(allQuestions);
        }

        console.log('Database populated successfully.');
        localStorage.setItem('databaseVersion', DB_VERSION);

    } catch (error) {
        console.error('Failed to initialize database:', error);
        if (dom.loadingOverlay) {
            dom.loadingOverlay.innerHTML = `<div class="loader-content"><h1>Error Initializing Database</h1><p>Could not load questions. Please check your connection and refresh the page.</p><p style="font-size:0.8em; color: var(--text-color-light)">${error.message}</p></div>`;
        }
        throw error; // Re-throw to stop app initialization
    }
}
