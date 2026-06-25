/* ==========================================================================
   WEALTH PLUS - SHREE AI AGENT MODULE (shree.js)
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    initShreeWidget();
});

let isShreeListening = false;
let shreeRecognition = null;

let attachedFileBase64 = null;
let attachedFileMimeType = null;
let attachedFileName = null;

let isSpeakingGlobally = false;

function initShreeWidget() {
    const toggleBtn = document.getElementById('btn-shree-toggle');
    const chatWindow = document.getElementById('shree-chat-window');
    const closeBtn = document.getElementById('btn-shree-close');
    const sendBtn = document.getElementById('btn-shree-send');
    const micBtn = document.getElementById('btn-shree-mic');
    const textInput = document.getElementById('shree-text-input');
    
    const settingsToggleBtn = document.getElementById('btn-shree-settings-toggle');
    const settingsContainer = document.getElementById('shree-settings-container');
    const messagesContainer = document.getElementById('shree-messages-container');
    const footerContainer = document.getElementById('shree-footer-container');
    
    const settingsBackBtn = document.getElementById('btn-shree-settings-back');
    const settingsSaveBtn = document.getElementById('btn-shree-settings-save');
    const apiKeyInput = document.getElementById('gemini-api-key');

    // 1. Toggle Chat Window
    toggleBtn.addEventListener('click', () => {
        chatWindow.classList.toggle('active');
        if (chatWindow.classList.contains('active')) {
            textInput.focus();
            scrollMessagesToBottom();
        }
    });

    closeBtn.addEventListener('click', () => {
        chatWindow.classList.remove('active');
    });

    // 2. Settings Toggle (Gear button)
    settingsToggleBtn.addEventListener('click', () => {
        if (settingsContainer.style.display === 'flex' || settingsContainer.classList.contains('active')) {
            // Close settings
            settingsContainer.style.display = 'none';
            settingsContainer.classList.remove('active');
            messagesContainer.style.display = 'flex';
            footerContainer.style.display = 'flex';
            textInput.focus();
        } else {
            // Open settings
            apiKeyInput.value = state.geminiApiKey || '';
            settingsContainer.style.display = 'flex';
            settingsContainer.classList.add('active');
            messagesContainer.style.display = 'none';
            footerContainer.style.display = 'none';
        }
    });

    settingsBackBtn.addEventListener('click', () => {
        settingsContainer.style.display = 'none';
        settingsContainer.classList.remove('active');
        messagesContainer.style.display = 'flex';
        footerContainer.style.display = 'flex';
        textInput.focus();
    });

    settingsSaveBtn.addEventListener('click', () => {
        const key = apiKeyInput.value.trim();
        state.geminiApiKey = key || null;
        saveState();
        alert("Gemini AI API Key saved!");
        speakShreeText("जय हरी! जेमिनी ए आई की चाबी सुरक्षित कर ली गई है।");
        
        // Go back
        settingsContainer.style.display = 'none';
        settingsContainer.classList.remove('active');
        messagesContainer.style.display = 'flex';
        footerContainer.style.display = 'flex';
        textInput.focus();
    });

    // 3. Send Text Command
    sendBtn.addEventListener('click', () => {
        processTextCommand();
    });

    textInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            processTextCommand();
        }
    });

    // 4. Voice Input (Web Speech Recognition)
    initSpeechRecognition(micBtn, textInput);

    // 5. File upload & paste listeners
    const attachBtn = document.getElementById('btn-shree-attach');
    const fileInput = document.getElementById('shree-file-input');

    if (attachBtn && fileInput) {
        attachBtn.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', (e) => {
            if (e.target.files && e.target.files[0]) {
                processAttachedFile(e.target.files[0]);
            }
        });
    }

    if (textInput) {
        textInput.addEventListener('paste', (e) => {
            const items = (e.clipboardData || e.originalEvent.clipboardData).items;
            for (const item of items) {
                if (item.kind === 'file') {
                    const blob = item.getAsFile();
                    processAttachedFile(blob);
                    e.preventDefault();
                    break;
                }
            }
        });
    }
}

function scrollMessagesToBottom() {
    const container = document.getElementById('shree-messages-container');
    if (container) {
        container.scrollTop = container.scrollHeight;
    }
}

function appendChatMessage(sender, text, timeText = "अभी") {
    const container = document.getElementById('shree-messages-container');
    if (!container) return;

    const div = document.createElement('div');
    div.className = `shree-msg msg-${sender}`;
    div.innerHTML = `
        <p>${text}</p>
        <span class="msg-time">${timeText}</span>
    `;
    container.appendChild(div);
    scrollMessagesToBottom();
}

// --- VOICE RECOGNITION (Speech-to-Text) ---
function initSpeechRecognition(micBtn, textInput) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        micBtn.style.display = 'none';
        console.warn("Speech Recognition API not supported in this browser.");
        return;
    }

    shreeRecognition = new SpeechRecognition();
    shreeRecognition.continuous = false;
    shreeRecognition.lang = 'hi-IN'; // Default to Hindi
    shreeRecognition.interimResults = false;
    shreeRecognition.maxAlternatives = 1;

    micBtn.addEventListener('click', () => {
        if (isShreeListening) {
            shreeRecognition.stop();
        } else {
            try {
                shreeRecognition.start();
            } catch (e) {
                console.error("Speech recognition start error:", e);
            }
        }
    });

    shreeRecognition.onstart = () => {
        isShreeListening = true;
        micBtn.classList.add('active');
        document.getElementById('shree-status-text').innerText = 'Listening voice...';
    };

    shreeRecognition.onend = () => {
        isShreeListening = false;
        micBtn.classList.remove('active');
        document.getElementById('shree-status-text').innerText = 'AI Assistant • Idle';
        
        // Auto-restart if currentUser exists and we are not speaking!
        if (state.currentUser && !isSpeakingGlobally) {
            setTimeout(() => {
                if (state.currentUser && !isSpeakingGlobally && !isShreeListening) {
                    try {
                        shreeRecognition.start();
                    } catch (e) {
                        console.error("Auto-restart mic onend failed:", e);
                    }
                }
            }, 300);
        }
    };

    shreeRecognition.onerror = (event) => {
        console.error("Speech recognition error:", event.error);
        isShreeListening = false;
        micBtn.classList.remove('active');
        document.getElementById('shree-status-text').innerText = 'AI Assistant • Idle';
    };

    shreeRecognition.onresult = (event) => {
        const textResult = event.results[0][0].transcript;
        textInput.value = textResult;
        processTextCommand();
    };

    // Continuous voice check loop to keep microphone alive after user logs in
    setInterval(() => {
        if (state.currentUser && shreeRecognition && !isShreeListening && !isSpeakingGlobally) {
            try {
                shreeRecognition.start();
            } catch (e) {
                // Ignore errors
            }
        }
    }, 3000);
}

// --- VOICE SYNTHESIS (Text-to-Speech) ---
function speakShreeText(text) {
    if (!window.speechSynthesis) return;
    
    // Stop any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'hi-IN'; // Speak in Hindi
    
    let pitch = 1.0; // default natural pitch
    let rate = 0.95;  // natural speed for normal lady tone

    const voices = window.speechSynthesis.getVoices();
    let selectedVoice = null;
    
    // 1. Look for a high-quality Hindi female voice (Google Hindi, Microsoft Kalpana, Swara, Heera)
    selectedVoice = voices.find(v => 
        (v.lang.includes('hi') || v.lang.includes('IN')) && 
        (v.name.toLowerCase().includes('female') || 
         v.name.toLowerCase().includes('kalpana') || 
         v.name.toLowerCase().includes('swara') || 
         v.name.toLowerCase().includes('google') ||
         v.name.toLowerCase().includes('heera'))
    );
    
    // 2. If not found, look for any Hindi voice (Hemant etc.)
    if (!selectedVoice) {
        selectedVoice = voices.find(v => v.lang.includes('hi') || v.lang.includes('IN'));
    }
    
    // 3. If still not found, look for any female voice as a fallback
    if (!selectedVoice) {
        selectedVoice = voices.find(v => v.name.toLowerCase().includes('female') || v.name.toLowerCase().includes('zira'));
    }

    if (selectedVoice) {
        utterance.voice = selectedVoice;
        
        // Tune pitch dynamically: Hemant (male) or male fallbacks should NOT have high pitch
        const nameLower = selectedVoice.name.toLowerCase();
        if (nameLower.includes('female') || nameLower.includes('kalpana') || nameLower.includes('swara') || nameLower.includes('heera') || nameLower.includes('google')) {
            pitch = 1.05; // Slightly sweet, natural female pitch
        } else if (nameLower.includes('male') || nameLower.includes('hemant')) {
            pitch = 1.0;  // Normal pitch for male voice (avoids robot/squeak)
        }
    }
    
    utterance.pitch = pitch;
    utterance.rate = rate;

    utterance.onstart = () => {
        isSpeakingGlobally = true;
        if (shreeRecognition && isShreeListening) {
            try {
                shreeRecognition.abort(); // Stop listening to avoid hearing herself speak
            } catch (e) {
                console.error("Error stopping recognition on speak start:", e);
            }
        }
    };

    utterance.onend = utterance.onerror = () => {
        isSpeakingGlobally = false;
        if (state.currentUser && shreeRecognition && !isShreeListening) {
            try {
                shreeRecognition.start();
            } catch (e) {
                console.error("Error restarting recognition on speak end:", e);
            }
        }
    };
    
    window.speechSynthesis.speak(utterance);
}

// --- COMMAND INTERPRETER ENGINE ---
async function processTextCommand() {
    const textInput = document.getElementById('shree-text-input');
    const query = textInput.value.trim();
    if (!query && !attachedFileBase64) return;

    // Display user message
    if (attachedFileBase64) {
        appendChatMessage('user', `Attached: ${attachedFileName} ${query ? `\n"${query}"` : ''}`);
        if (attachedFileMimeType.startsWith('image/')) {
            const lastMsg = document.getElementById('shree-messages-container').lastElementChild;
            if (lastMsg) {
                const img = document.createElement('img');
                img.src = `data:${attachedFileMimeType};base64,${attachedFileBase64}`;
                img.style.maxWidth = '100%';
                img.style.maxHeight = '150px';
                img.style.borderRadius = '4px';
                img.style.marginTop = '6px';
                img.style.display = 'block';
                lastMsg.querySelector('p').appendChild(img);
            }
        }
    } else {
        appendChatMessage('user', query);
    }
    textInput.value = '';

    // Set status to thinking
    document.getElementById('shree-status-text').innerText = 'Processing...';

    let parsedAction = null;
    let replyText = "";

    if (attachedFileBase64) {
        if (!state.geminiApiKey) {
            replyText = "माफ़ कीजिये, स्क्रीनशॉट या फ़ाइल प्रोसेस करने के लिए जेमिनी ए आई की चाबी (API Key) सेटिंग्स में सेव होनी चाहिए।";
        } else {
            try {
                parsedAction = await callGeminiMultimodal(query, attachedFileBase64, attachedFileMimeType);
            } catch (err) {
                console.error("Gemini Multimodal error:", err);
            }
        }
        clearAttachment();
    } else {
        parsedAction = parseLocalCommand(query);
        const hasDevanagari = /[\u0900-\u097F]/.test(query);
        const needsTranslation = hasDevanagari && state.geminiApiKey;
        if ((!parsedAction || parsedAction.fallback || needsTranslation) && state.geminiApiKey) {
            try {
                const geminiResult = await callGeminiAI(query);
                if (geminiResult) {
                    parsedAction = geminiResult;
                }
            } catch (err) {
                console.error("Gemini parsing error fallback:", err);
            }
        }
    }

    // Execute the parsed action
    if (parsedAction && parsedAction.success !== false && parsedAction.action) {
        replyText = await executeAgentAction(parsedAction);
    } else if (parsedAction && parsedAction.reply) {
        replyText = parsedAction.reply;
    } else if (!replyText) {
        const hasDevanagari = /[\u0900-\u097F]/.test(query);
        if (hasDevanagari && !state.geminiApiKey) {
            replyText = "माफ़ कीजिये, हिंदी कमांड्स और स्मार्ट बातचीत के लिए सेटिंग्स (⚙️) में जेमिनी ए.आई. चाबी (Gemini API Key) सेट होना ज़रूरी है। कृपया सेटिंग्स में सही चाबी सेव करें।";
        } else {
            replyText = "माफ़ कीजिये, मैं इस कमांड को समझ नहीं पाई। क्या आप कृपया दोबारा स्पष्ट रूप से बताएंगे? (जैसे: 'Shree naya client add karo...')";
        }
    }

    // Show Shree response & vocal feedback
    appendChatMessage('shree', replyText);
    speakShreeText(replyText);
    document.getElementById('shree-status-text').innerText = 'AI Assistant • Idle';
}

// --- LOCAL PARSER (Offline Regex NLP Rules) ---
function parseLocalCommand(text) {
    const cleanText = text.toLowerCase().trim();

    // Check if the query is a request to edit code/design/UI
    const codeKeywords = ["edit", "update", "change", "modify", "updation", "theme", "style", "css", "html", "design", "color", "title", "heading"];
    if (codeKeywords.some(kw => cleanText.includes(kw))) {
        return { fallback: true };
    }

    // 1. Client Registration
    // E.g. "Shree naya client add kar do client ka name hai Balkrishna Premnarayan"
    // E.g. "Balkrishna Premnarayan client register karo"
    const hasClientKw = cleanText.includes("client") || cleanText.includes("क्लाइंट") || cleanText.includes("ग्राहक") || cleanText.includes("कस्टमर");
    const hasAddKw = cleanText.includes("add") || cleanText.includes("register") || cleanText.includes("banao") || cleanText.includes("bana do") || cleanText.includes("naya") || cleanText.includes("naye") || cleanText.includes("ऐड") || cleanText.includes("एड") || cleanText.includes("जोड़ो") || cleanText.includes("जोड़ो") || cleanText.includes("जोड़") || cleanText.includes("बना");

    if (hasClientKw && hasAddKw) {
        let name = "";
        
        // 1. Check if the user specified "नाम से" or "name se" (e.g. "Balkrishna ke naam se new client add kro")
        if (cleanText.includes("नाम से") || cleanText.includes("name se")) {
            const separator = cleanText.includes("के नाम से") ? "के नाम से" : (cleanText.includes("name se") ? "name se" : "नाम से");
            const parts = text.split(new RegExp(separator, "i"));
            if (parts[0]) {
                name = cleanClientName(parts[0]);
            }
        }
        
        // 2. Indicators (e.g. "client ka name Balkrishna hai")
        if (!name) {
            const nameIndicators = [
                "name hai", "naam hai", "name is", "naam is", "client ka name", "client ka naam",
                "नाम है", "नाम", "नाम:"
            ];
            for (const ind of nameIndicators) {
                if (cleanText.includes(ind)) {
                    const parts = text.split(new RegExp(ind, "i"));
                    if (parts[1]) {
                        name = cleanClientName(parts[1]);
                        break;
                    }
                }
            }
        }
        
        // 3. Fallback to cleaning the entire string if indicators don't match
        if (!name) {
            name = cleanClientName(text);
        }

        if (name && name.length > 2) {
            // Transliterate Devanagari to English character name offline
            const isHindi = /[\u0900-\u097F]/.test(name);
            const finalName = isHindi ? transliterateHindiToEnglish(name) : name;
            
            return {
                action: "addClient",
                data: { name: finalName }
            };
        } else {
            return {
                success: false,
                reply: "कृपया क्लाइंट का नाम बताएं। (जैसे: 'श्री नया क्लाइंट जोड़ो क्लाइंट का नाम बालकृष्ण प्रेमनारायण है')"
            };
        }
    }

    // 2. Extract Amount (numbers between 10 and 9,999,999)
    const amountMatch = cleanText.match(/\b\d{2,7}\b/);
    if (!amountMatch) return null;
    const amount = parseInt(amountMatch[0]);

    // 3. Extract Date (optional)
    // E.g. "date 24-06-26 me" or "24-06-2026"
    let dateStr = new Date().toISOString().split('T')[0]; // Default to today
    const dateMatch = cleanText.match(/(\d{2,4})[-\/](\d{2})[-\/](\d{2,4})/);
    if (dateMatch) {
        let part1 = dateMatch[1];
        let part2 = dateMatch[2];
        let part3 = dateMatch[3];
        let year = "2026";
        let month = part2;
        let day = "01";
        
        if (part1.length === 4) {
            year = part1;
            day = part3;
        } else if (part3.length === 4) {
            year = part3;
            day = part1;
        } else {
            // Both are 2 digits
            if (part1 === "26" || part1 === "2026") {
                year = "2026";
                day = part3;
            } else if (part3 === "26" || part3 === "2026") {
                year = "2026";
                day = part1;
            } else {
                year = "20" + part3;
                day = part1;
            }
        }
        month = month.padStart(2, '0');
        day = day.padStart(2, '0');
        dateStr = `${year}-${month}-${day}`;
    }

    // 4. Extract Account/Mode
    // Search in state.accounts
    let mode = "";
    for (const acc of state.accounts) {
        if (cleanText.includes(acc.name.toLowerCase())) {
            mode = acc.name;
            break;
        }
    }
    
    // Check if user specified a specific bank code like "boi-0308" or "boi-1234"
    if (!mode) {
        const accountCodeMatch = cleanText.match(/\b([a-z]{2,5}[-\s]?\d{2,6})\b/);
        if (accountCodeMatch && accountCodeMatch[1]) {
            const potentialAccName = accountCodeMatch[1].toUpperCase();
            if (!potentialAccName.match(/^\d{2,4}[-\s]?\d{2}$/)) { // avoid matching dates like 24-06
                const exists = state.accounts.find(a => a.name.toLowerCase() === potentialAccName.toLowerCase());
                if (exists) {
                    mode = exists.name;
                } else {
                    const newAcc = {
                        id: "acc_" + Date.now(),
                        name: potentialAccName,
                        type: "Bank"
                    };
                    addAccountDirect(newAcc);
                    mode = newAcc.name;
                }
            }
        }
    }

    if (!mode) {
        // Fallback checks
        if (cleanText.includes("cash") || cleanText.includes("nagad")) {
            mode = state.accounts.find(a => a.type === "Cash")?.name || "Main Cash";
        } else if (cleanText.includes("bank") || cleanText.includes("online") || cleanText.includes("boi") || cleanText.includes("hdfc")) {
            mode = state.accounts.find(a => a.type === "Bank")?.name || "HDFC Bank";
        } else {
            mode = state.accounts[0]?.name || "Main Cash";
        }
    }

    // 5. Extract Client
    let clientObj = null;
    for (const c of state.clients) {
        if (cleanText.includes(c.name.toLowerCase())) {
            clientObj = c;
            break;
        }
    }

    let clientName = "Walk-in Client";
    let clientId = "";
    
    if (clientObj) {
        clientName = clientObj.name;
        clientId = clientObj.id;
    } else {
        // Try to extract client name using regex: "[Name] client" or "[Name] clinet"
        const clientMatch = cleanText.match(/([a-z0-9\s\.\-]+?)\s+(?:client|clinet)/i);
        if (clientMatch && clientMatch[1]) {
            let extractedName = clientMatch[1].replace(/shree|ai|karo|please|add|received|cash|date/gi, "").trim();
            // Capitalize first letter of each word
            extractedName = extractedName.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
            if (extractedName.length > 2) {
                clientName = extractedName;
            }
        }
    }

    // 6. Action Detection (Income vs Expense)
    const isIncome = cleanText.includes("received") || cleanText.includes("mile") || cleanText.includes("mila") || cleanText.includes("aaye") || cleanText.includes("income") || (clientName !== "Walk-in Client" && cleanText.includes("received")) || (clientName !== "Walk-in Client" && cleanText.includes("add") && !cleanText.includes("kharch") && !cleanText.includes("expense"));
    
    if (isIncome) {
        return {
            action: "addIncome",
            data: {
                clientName: clientName,
                clientId: clientId,
                amount: amount,
                date: dateStr,
                mode: mode
            }
        };
    } else {
        // Expense Action
        // Find category from text
        let category = "Others";
        for (const cat of Object.keys(state.categoriesConfig)) {
            if (cleanText.includes(cat.toLowerCase()) || (cat === "Others" && cleanText.includes("misc"))) {
                category = cat;
                break;
            }
        }
        
        // Description clean
        let desc = text.replace(/shree|ai|karo|karein|add|kar do|kar\s+do|me|par|under|date|kharch|expense|exp|rupees|rs|rupay/gi, "");
        desc = desc.replace(new RegExp(amount, 'g'), "");
        desc = desc.replace(new RegExp(category, 'gi'), "");
        if (category === "Others") desc = desc.replace(/misc\.?\s*expenses?/gi, "");
        desc = desc.replace(new RegExp(mode, 'gi'), "");
        if (dateMatch) desc = desc.replace(new RegExp(dateMatch[0], 'g'), "");
        
        desc = desc.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "").replace(/\s+/g, " ").trim();
        if (!desc) desc = "Expense Entry";

        return {
            action: "addExpense",
            data: {
                description: desc,
                category: category,
                amount: amount,
                date: dateStr,
                mode: mode,
                clientId: clientId
            }
        };
    }
}

// --- ACTION EXECUTER ENGINE ---
async function executeAgentAction(actionObj) {
    if (!actionObj || !actionObj.action) return "माफ़ कीजिये, मैं इसे समझ नहीं पाई।";
    
    if (actionObj.action === "addClient") {
        const clientName = actionObj.data.name;
        const exists = state.clients.find(c => c.name.toLowerCase() === clientName.toLowerCase());
        if (exists) {
            return `क्लाइंट "${clientName}" पहले से ही registered है।`;
        }
        const clientObj = {
            id: "c_" + Date.now(),
            name: clientName,
            monthlyPay: 0,
            yearlyPay: 0
        };
        addClientDirect(clientObj);
        renderPage(state.activePage);
        return `जय हरी! नया क्लाइंट "${clientName}" सफलतापूर्वक जोड़ दिया गया है।`;
    }
    
    if (actionObj.action === "addIncome") {
        const { clientName, clientId, amount, date, mode } = actionObj.data;
        let finalClientId = clientId;
        let finalClientName = clientName;
        
        if (!finalClientId && clientName && clientName !== "Walk-in Client") {
            const found = state.clients.find(c => c.name.toLowerCase().includes(clientName.toLowerCase()) || clientName.toLowerCase().includes(c.name.toLowerCase()));
            if (found) {
                finalClientId = found.id;
                finalClientName = found.name;
            } else {
                // Register client on the fly
                const newClientObj = {
                    id: "c_" + Date.now(),
                    name: clientName,
                    monthlyPay: 0,
                    yearlyPay: 0
                };
                addClientDirect(newClientObj);
                finalClientId = newClientObj.id;
                finalClientName = newClientObj.name;
            }
        }
        
        const incomeObj = {
            id: "i_" + Date.now(),
            clientId: finalClientId,
            amount: amount,
            date: date,
            mode: mode
        };
        addIncomeDirect(incomeObj);
        renderPage(state.activePage);
        return `जय हरी! क्लाइंट "${finalClientName}" से ₹${amount.toLocaleString('en-IN')} का भुगतान ${mode} में दिनांक ${date} को दर्ज कर लिया गया है।`;
    }
    
    if (actionObj.action === "addExpense") {
        const { description, category, amount, date, mode, clientId } = actionObj.data;
        const txObj = {
            id: "t_" + Date.now(),
            description: description,
            category: category,
            amount: amount,
            date: date,
            mode: mode,
            clientId: clientId || ""
        };
        addExpenseDirect(txObj);
        renderPage(state.activePage);
        return `जय हरी! ₹${amount.toLocaleString('en-IN')} का खर्च "${description}" (श्रेणी: ${category}) ${mode} से दिनांक ${date} को दर्ज कर दिया गया है।`;
    }

    if (actionObj.action === "modifyCode") {
        const { file, instruction, commitMessage } = actionObj.data;
        
        // 1. Fetch current file content
        appendChatMessage('shree', `Fetching current content of ${file}...`);
        let currentContent = "";
        try {
            const resp = await fetch(file);
            if (!resp.ok) throw new Error(`Fetch failed: ${resp.statusText}`);
            currentContent = await resp.text();
        } catch (err) {
            console.error("Fetch local file error:", err);
            return `माफ़ कीजिये, मैं ${file} को लोड नहीं कर पाई। क्या आप लोकल पाइथन सर्वर चला रहे हैं?`;
        }

        // 2. Call Gemini Code Editor
        appendChatMessage('shree', `Analyzing edit instruction with Gemini AI...`);
        const editResult = await callGeminiCodeEditor(file, currentContent, instruction);
        if (!editResult || !editResult.replacements || editResult.replacements.length === 0) {
            return `माफ़ कीजिये, मैं ${file} के लिए एडिट्स जनरेट नहीं कर पाई।`;
        }

        // 3. Apply replacements
        let updatedContent = currentContent;
        let successCount = 0;
        for (const rep of editResult.replacements) {
            if (updatedContent.includes(rep.search)) {
                updatedContent = updatedContent.replace(rep.search, rep.replace);
                successCount++;
            } else {
                console.warn(`Search block not found in file:\n${rep.search}`);
            }
        }

        if (successCount === 0) {
            return `माफ़ कीजिये, एडिट के लिए चुने गए कोड ब्लॉक्स ${file} में नहीं मिले।`;
        }

        // 4. Save file locally using POST /api/write-file
        appendChatMessage('shree', `Writing modifications back to local disk...`);
        try {
            const writeResp = await fetch('/api/write-file', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ filename: file, content: updatedContent })
            });
            const writeData = await writeResp.json();
            if (writeData.error) {
                throw new Error(writeData.error);
            }
        } catch (err) {
            console.error("Local write error:", err);
            return `माफ़ कीजिये, मैं एडिट्स को डिस्क पर सेव नहीं कर पाई: ${err.message}`;
        }

        // 5. Trigger auto-deploy if git configs are present
        if (state.githubToken && state.githubRepo) {
            appendChatMessage('shree', `Successfully wrote changes to disk! Initiating GitHub Auto-Deployment...`);
            
            const commitInput = document.getElementById('github-commit-message');
            if (commitInput) {
                commitInput.value = commitMessage || `Edit ${file} via Shree AI`;
            }
            
            deployAppToGitHub();
            
            return `जय हरी! मैंने ${file} में बदलाव कर दिए हैं और गिटहब पर डिप्लॉयमेंट शुरू कर दिया है। 1 मिनट में लाइव हो जाएगा!`;
        } else {
            return `जय हरी! मैंने ${file} में बदलाव डिस्क पर लोकल रूप से कर दिए हैं। (गिटहब डिप्लॉयमेंट के लिए कृपया मास्टर सेटिंग्स में टोकन कॉन्फ़िगर करें)`;
        }
    }
    
    return "माफ़ कीजिये, यह एक्शन अभी सपोर्टेड नहीं है।";
}

// --- GEMINI SMART PARSER Fallback ---
async function callGeminiAI(userText) {
    const apiKey = state.geminiApiKey;
    if (!apiKey) return null;

    // Filter dynamic lists for context
    const cleanClients = state.clients.map(c => ({ id: c.id, name: c.name }));
    const cleanAccounts = state.accounts.map(a => ({ name: a.name, type: a.type }));
    const activeCategories = Object.keys(state.categoriesConfig);

    const systemInstruction = `
You are "Shree", a smart agentic AI Munim (bookkeeper) and developer assistant for the "Wealth Plus" application.
Your task is to parse the user's requests (written in Hinglish, Hindi, or English) into a structured JSON action object.

CRITICAL TRANSLATION RULE:
Even if the user request or voice command is in Hindi (Devanagari script), you MUST translate or transliterate all extracted data fields (such as client name, description, category, and account mode) to English (Latin characters) in the output JSON. For example, "बालकृष्ण प्रेमनारायण" must be transliterated as "Balkrishna Premnarayan", "मिठाई" as "Mithai", "नकद" as "Cash", and "बैंक" as "Bank".
The spoken "reply" field in the output JSON MUST be in warm, sweet, human-like Hindi (written in Devanagari script) to sound like a polite lady bookkeeper (Munim), starting with "जय हरी!".

Analyze the request and return ONLY a valid JSON object. Do not include markdown code block syntax (like \`\`\`json) or any extra text.

Active Categories config: ${JSON.stringify(activeCategories)}
Active Accounts configuration: ${JSON.stringify(cleanAccounts)}
Active Clients registered list: ${JSON.stringify(cleanClients)}

Today's Date: ${new Date().toISOString().split('T')[0]} (Year is 2026).
Parse any date in the request to YYYY-MM-DD format.

You must return JSON in this exact structure:
{
  "success": true,
  "action": "addClient" | "addExpense" | "addIncome" | "modifyCode",
  "data": {
    // for addClient:
    "name": "extracted client name"
    
    // for addExpense:
    "description": "expense details",
    "category": "category name (Food, Shopping, Bills, Transport, Rent, or Others)",
    "amount": number,
    "date": "YYYY-MM-DD",
    "mode": "account name",
    "clientId": "client id if specified, otherwise empty string"

    // for addIncome:
    "clientName": "client name",
    "clientId": "client id if matches, otherwise empty string",
    "amount": number,
    "date": "YYYY-MM-DD",
    "mode": "destination account name"

    // for modifyCode:
    "file": "index.html" | "app.js" | "style.css" | "shree.js",
    "instruction": "clear precise instruction of what to edit in the file",
    "commitMessage": "commit message summarizing the change"
  },
  "reply": "Hindi/Hinglish vocal confirmation message summarizing the action taken."
}

If you cannot parse it, return:
{
  "success": false,
  "reply": "माफ़ कीजिये, मैं इसे समझ नहीं पाई। क्या आप कृपया स्पष्ट रूप से बताएंगे?"
}
`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    const payload = {
        contents: [
            { role: "user", parts: [{ text: userText }] }
        ],
        systemInstruction: {
            parts: [{ text: systemInstruction }]
        },
        generationConfig: {
            responseMimeType: "application/json"
        }
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await response.json();
        if (data.error) {
            console.error("Gemini API Error:", data.error);
            return {
                success: false,
                reply: `माफ़ कीजिये, जेमिनी ए.आई. एरर: ${data.error.message} (कृपया सेटिंग्स ⚙️ में सही चाबी चेक करें)`
            };
        }
        const jsonText = data.candidates[0].content.parts[0].text;
        return JSON.parse(jsonText);
    } catch (e) {
        console.error("Gemini API call failed:", e);
        return {
            success: false,
            reply: `माफ़ कीजिये, जेमिनी ए.आई. कनेक्शन फेल हो गया: ${e.message}`
        };
    }
}

async function callGeminiCodeEditor(fileName, fileContent, instruction) {
    const apiKey = state.geminiApiKey;
    if (!apiKey) return null;

    const systemInstruction = `
You are a highly precise code editing assistant.
Your task is to analyze the provided file content and generate a list of search-and-replace replacements to implement the user's requested edit.

You must only return a valid JSON object. Do not include markdown code block syntax (like \`\`\`json) or any extra text.

Return JSON in this structure:
{
  "replacements": [
    {
      "search": "exact block of lines to find in the original file",
      "replace": "new block of lines to replace it with"
    }
  ]
}

CRITICAL RULES:
1. The 'search' string must match the target code EXACTLY, including leading/trailing whitespace, punctuation, and structure.
2. Provide enough context lines in the 'search' block to ensure it is unique within the file.
3. Only modify what is requested in the instruction. Do not rewrite unrelated code.
`;

    const promptText = `
Target File: ${fileName}
Edit Instruction: ${instruction}

--- CURRENT FILE CONTENT ---
${fileContent}
`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    const payload = {
        contents: [
            { role: "user", parts: [{ text: promptText }] }
        ],
        systemInstruction: {
            parts: [{ text: systemInstruction }]
        },
        generationConfig: {
            responseMimeType: "application/json"
        }
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await response.json();
        const jsonText = data.candidates[0].content.parts[0].text;
        return JSON.parse(jsonText);
    } catch (e) {
        console.error("Gemini Code Editor API call failed:", e);
        return null;
    }
}

function processAttachedFile(file) {
    if (!file) return;
    
    if (file.size > 5 * 1024 * 1024) {
        alert("File size exceeds 5MB limit.");
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        attachedFileBase64 = e.target.result.split(',')[1];
        attachedFileMimeType = file.type;
        attachedFileName = file.name || "Pasted Image";
        
        showAttachmentPreview(attachedFileName, e.target.result);
    };
    reader.readAsDataURL(file);
}

function showAttachmentPreview(fileName, dataUrl) {
    const container = document.getElementById('shree-preview-container');
    if (!container) return;
    
    container.style.display = 'flex';
    
    const isImage = attachedFileMimeType.startsWith('image/');
    
    container.innerHTML = `
        <div style="position:relative; display:flex; align-items:center; gap:8px; background:rgba(0,0,0,0.05); padding:4px 8px; border-radius:4px; max-width:100%;">
            ${isImage ? `<img src="${dataUrl}" style="height:32px; width:32px; object-fit:cover; border-radius:3px;">` : `<i data-lucide="file-text" style="width:24px; height:24px; color:var(--primary);"></i>`}
            <span style="font-size:11px; max-width:180px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:var(--text-primary);">${fileName}</span>
            <button type="button" id="btn-clear-shree-attach" style="background:transparent; border:none; color:var(--danger); cursor:pointer; display:flex; align-items:center; justify-content:center; padding:2px;"><i data-lucide="x" style="width:14px; height:14px;"></i></button>
        </div>
    `;
    
    lucide.createIcons();
    
    document.getElementById('btn-clear-shree-attach').addEventListener('click', clearAttachment);
}

function clearAttachment() {
    attachedFileBase64 = null;
    attachedFileMimeType = null;
    attachedFileName = null;
    
    const container = document.getElementById('shree-preview-container');
    if (container) {
        container.style.display = 'none';
        container.innerHTML = '';
    }
    
    const fileInput = document.getElementById('shree-file-input');
    if (fileInput) fileInput.value = '';
}

async function callGeminiMultimodal(userText, base64Data, mimeType) {
    const apiKey = state.geminiApiKey;
    if (!apiKey) return null;

    const cleanClients = state.clients.map(c => ({ id: c.id, name: c.name }));
    const cleanAccounts = state.accounts.map(a => ({ name: a.name, type: a.type }));
    const activeCategories = Object.keys(state.categoriesConfig);

    const systemInstruction = `
You are "Shree", a smart agentic AI Munim (bookkeeper) and developer assistant for the "Wealth Plus" application.
Your task is to analyze the attached image/document receipt along with any user request, extract transaction details, and parse them into a structured JSON action object.

CRITICAL TRANSLATION RULE:
Even if the receipt, document, or user request is in Hindi (Devanagari script), you MUST translate or transliterate all extracted data fields (such as client name, description, category, and account mode) to English (Latin characters) in the output JSON. For example, "बालकृष्ण प्रेमनारायण" must be transliterated as "Balkrishna Premnarayan", "मिठाई" as "Mithai", "नकद" as "Cash", and "बैंक" as "Bank".
The spoken "reply" field in the output JSON MUST be in warm, sweet, human-like Hindi (written in Devanagari script) to sound like a polite lady bookkeeper (Munim), starting with "जय हरी!".

Analyze the image/document and return ONLY a valid JSON object. Do not include markdown code block syntax (like \`\`\`json) or any extra text.

Active Categories config: ${JSON.stringify(activeCategories)}
Active Accounts configuration: ${JSON.stringify(cleanAccounts)}
Active Clients registered list: ${JSON.stringify(cleanClients)}

Today's Date: ${new Date().toISOString().split('T')[0]} (Year is 2026).
Parse any date in the request to YYYY-MM-DD format.

You must return JSON in this exact structure:
{
  "success": true,
  "action": "addClient" | "addExpense" | "addIncome",
  "data": {
    // for addClient:
    "name": "extracted client name"
    
    // for addExpense:
    "description": "expense details (e.g. Mithai, Tea, AWS Server)",
    "category": "category name (Food, Shopping, Bills, Transport, Rent, or Others)",
    "amount": number,
    "date": "YYYY-MM-DD",
    "mode": "account name (e.g. Main Cash, HDFC Bank)",
    "clientId": "client id if specified, otherwise empty string"

    // for addIncome:
    "clientName": "client name",
    "clientId": "client id if matches, otherwise empty string",
    "amount": number,
    "date": "YYYY-MM-DD",
    "mode": "destination account name"
  },
  "reply": "Hindi/Hinglish vocal confirmation message summarizing the action taken."
}
`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    const payload = {
        contents: [
            {
                role: "user",
                parts: [
                    { text: userText || "Extract details from this transaction receipt or document and log it." },
                    {
                        inlineData: {
                            mimeType: mimeType,
                            data: base64Data
                        }
                    }
                ]
            }
        ],
        systemInstruction: {
            parts: [{ text: systemInstruction }]
        },
        generationConfig: {
            responseMimeType: "application/json"
        }
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await response.json();
        if (data.error) {
            console.error("Gemini Multimodal Error:", data.error);
            return {
                success: false,
                reply: `माफ़ कीजिये, जेमिनी ए.आई. एरर: ${data.error.message} (कृपया सेटिंग्स ⚙️ में सही चाबी चेक करें)`
            };
        }
        const jsonText = data.candidates[0].content.parts[0].text;
        return JSON.parse(jsonText);
    } catch (e) {
        console.error("Gemini Multimodal call failed:", e);
        return {
            success: false,
            reply: `माफ़ कीजिये, जेमिनी ए.आई. कनेक्शन फेल हो गया: ${e.message}`
        };
    }
}

// --- HELPER FUNCTIONS FOR OFFLINE HINDI PARSING ---
function cleanClientName(rawName) {
    const stopwords = [
        "add", "kar", "do", "karo", "please", "shree", "ai", "जोड़ो", "जोड़ो", "करो", "कर", "दो", "नए", "नया", "नाम", "है", "को", "से", "के", "client", "क्लाइंट", "ग्राहक", "कस्टमर", "register",
        "श्री", "shri", "hai", "banao", "बनाओ", "बना", "ka", "का", "naam", "se", "ke"
    ];
    const words = rawName.split(/\s+/);
    const filtered = words.filter(w => !stopwords.includes(w.toLowerCase()));
    let name = filtered.join(" ").trim();
    name = name.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "").trim();
    return name.replace(/\s+/g, " ");
}

function transliterateHindiToEnglish(str) {
    if (!str) return "";
    const mapping = {
        'अ': 'a', 'आ': 'a', 'इ': 'i', 'ई': 'ee', 'उ': 'u', 'ऊ': 'oo', 'ऋ': 'ri',
        'ए': 'e', 'ऐ': 'ai', 'ओ': 'o', 'औ': 'au', 'अं': 'an', 'अः': 'ah',
        'क': 'k', 'ख': 'kh', 'ग': 'g', 'घ': 'gh', 'ङ': 'n',
        'च': 'ch', 'छ': 'chh', 'ज': 'j', 'झ': 'jh', 'ञ': 'n',
        'ट': 't', 'ठ': 'th', 'ड': 'd', 'ढ': 'dh', 'ण': 'n',
        'त': 't', 'थ': 'th', 'द': 'd', 'ध': 'dh', 'न': 'n',
        'प': 'p', 'फ': 'ph', 'ब': 'b', 'भ': 'bh', 'म': 'm',
        'य': 'y', 'र': 'r', 'ल': 'l', 'व': 'v', 'श': 'sh', 'ष': 'sh', 'स': 's', 'ह': 'h',
        'क्ष': 'ksh', 'त्र': 'tr', 'ज्ञ': 'gy',
        'ा': 'a', 'ि': 'i', 'ी': 'ee', 'ु': 'u', 'ू': 'oo', 'ृ': 'ri',
        'े': 'e', 'ै': 'ai', 'ो': 'o', 'ौ': 'au', 'ं': 'n', 'ः': 'h', 'ँ': 'n',
        '्': ''
    };

    let result = "";
    for (let i = 0; i < str.length; i++) {
        const char = str[i];
        const nextChar = str[i+1];
        if (mapping[char] !== undefined) {
            let eng = mapping[char];
            const isConsonant = "कखगघङचछजझञटठडढणतथदधनपफबभमयरलवशषसह".includes(char);
            if (isConsonant) {
                const nextIsMatraOrHalant = nextChar && "ािीुूृेैोौं्".includes(nextChar);
                if (!nextIsMatraOrHalant && nextChar !== " " && nextChar !== undefined) {
                    eng += "a";
                }
            }
            result += eng;
        } else {
            result += char;
        }
    }
    return result.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

