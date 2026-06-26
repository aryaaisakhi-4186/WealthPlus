/**
 * Sindhu AI Assistant (Sindhu AI Munim)
 * Version: 4.0.0
 * 
 * Elegant Indigo/Violet Theme Assistant supporting client registration,
 * expense allocation, and income logging via voice/text in Hindi, English, and Hinglish.
 */

(function () {
    let sindhuSessionBuffer = "";

    // Expose updateSindhuVisibility globally
    window.updateSindhuVisibility = function () {
        const sindhuWidget = document.getElementById('sindhu-chat-widget');
        if (!sindhuWidget) return;
        if (typeof state !== 'undefined' && state.currentUser) {
            sindhuWidget.style.display = 'block';
            // Sync the API key input from the global state
            const geminiKeyInput = document.getElementById("sindhu-gemini-key");
            if (geminiKeyInput && state.geminiApiKey) {
                geminiKeyInput.value = state.geminiApiKey;
            }
        } else {
            sindhuWidget.style.display = 'none';
            const chatWindow = document.getElementById('sindhu-chat-window');
            if (chatWindow) {
                chatWindow.classList.remove('active');
            }
            document.body.classList.remove("sindhu-chat-active");
            if (window.speechSynthesis) {
                window.speechSynthesis.cancel();
            }
            // Clear session buffer on hide
            sindhuSessionBuffer = "";
        }
    };

    // Global navigation helpers for specific sub-details
    window.navigateToLedgerAccount = function(accountNameOrId) {
        if (typeof state === 'undefined' || !state.accounts) return;
        let acc = state.accounts.find(a => a.id === accountNameOrId || a.name.toLowerCase().includes(accountNameOrId.toLowerCase()));
        if (!acc) return;
        
        state.selectedLedgerAccountId = acc.id;
        if (typeof navigateToPage === 'function') navigateToPage('reports');
        if (typeof setReportType === 'function') setReportType('ledger');
        
        const selectEl = document.getElementById('ledger-account-select');
        if (selectEl) {
            selectEl.value = acc.id;
        }
        if (typeof renderAccountLedgerDetails === 'function') {
            renderAccountLedgerDetails();
        }
    };

    window.navigateToClientReport = function(clientNameOrId) {
        if (typeof state === 'undefined' || !state.clients) return;
        let client = state.clients.find(c => c.id === clientNameOrId || c.name.toLowerCase().includes(clientNameOrId.toLowerCase()));
        if (!client) return;
        
        if (typeof navigateToPage === 'function') navigateToPage('reports');
        if (typeof setReportType === 'function') setReportType('client');
        
        const selectEl = document.getElementById('report-client-select');
        if (selectEl) {
            selectEl.value = client.id;
        }
        if (typeof renderClientReportDetails === 'function') {
            renderClientReportDetails(client.id);
        }
    };

    // Helper: Clean client name for database saving in English
    function cleanClientName(rawName) {
        let cleaned = rawName.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, " ");
        const stopwords = [
            "add", "kar", "do", "karo", "please", "shree", "sindhu", "ai", "जोड़ो", "जोड़ो", "करो", "कर", "दो", "नए", "नया", "नाम", "है", "को", "से", "के", "client", "क्लाइंट", "ग्राहक", "कस्टमर", "register",
            "श्री", "shri", "hai", "banao", "बनाओ", "बना", "ka", "का", "naam", "se", "ke",
            "jiski", "jiska", "जिसकी", "जिसका", "monthly", "payment", "मंथली", "पेमेंट", "naya", "naye", "new", "aur", "and", "ऐड", "एड",
            "मासिक", "भुगतान", "प्रति", "माह", "सिंधु", "रुपए", "रुपये", "रुपया", "रिसीव", "जमा", "क्रेडिट", "अपडेट", "एंट्री",
            "receive", "received", "payment", "cash", "bank", "online", "upi", "via", "rs", "rupees", "rupay"
        ];
        let words = cleaned.split(/\s+/);
        let filtered = words.filter(w => !stopwords.includes(w.toLowerCase()));
        let name = filtered.join(" ").trim();
        return name.replace(/\s+/g, " ").trim();
    }

    // Helper: Parse date from text (DD-MM-YYYY, DD/MM/YYYY, or DD Month YYYY)
    function parseDateFromText(text) {
        let cleanText = text.toLowerCase().trim();
        
        // 1. Numeric format (DD-MM-YYYY or DD/MM/YYYY)
        let dMatch = cleanText.match(/\b(\d{1,2})[-\/. ](\d{1,2})[-\/. ](\d{4})\b/);
        if (dMatch) {
            let day = String(dMatch[1]).padStart(2, '0');
            let month = String(dMatch[2]).padStart(2, '0');
            let year = dMatch[3];
            return `${year}-${month}-${day}`;
        }
        
        // 2. Month name format (e.g. 27-jun-2026 or 27 june 2026)
        const months = {
            jan: '01', january: '01',
            feb: '02', february: '02',
            mar: '03', march: '03',
            apr: '04', april: '04',
            may: '05',
            jun: '06', june: '06',
            jul: '07', july: '07',
            aug: '08', august: '08',
            sep: '09', september: '09',
            oct: '10', october: '10',
            nov: '11', november: '11',
            dec: '12', december: '12'
        };
        
        let mMatch = cleanText.match(/\b(\d{1,2})[-\s.\/](jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*[-\s.\/](\d{4})\b/i);
        if (mMatch) {
            let day = String(mMatch[1]).padStart(2, '0');
            let monthName = mMatch[2].substring(0, 3);
            let month = months[monthName] || '01';
            let year = mMatch[3];
            return `${year}-${month}-${day}`;
        }
        
        return null;
    }

    // Helper: Resolve account name from user representation
    function resolveAccountName(modeStr, userTextInput = "") {
        if (typeof state === 'undefined' || !state.accounts || state.accounts.length === 0) {
            return null;
        }
        
        let targetStr = (modeStr || "").toLowerCase().trim();
        let fullText = (userTextInput || "").toLowerCase().trim();
        
        // 1. Try matching targetStr with account.id
        let acc = state.accounts.find(a => a.id.toLowerCase() === targetStr);
        if (acc) return acc.name;
        
        // 2. Try matching targetStr with account.name (case insensitive)
        acc = state.accounts.find(a => a.name.toLowerCase() === targetStr);
        if (acc) return acc.name;
        
        // 3. Try matching normalized targetStr (remove spaces, hyphens, underscores)
        let normTarget = targetStr.replace(/[\s\-_]/g, '');
        if (normTarget) {
            acc = state.accounts.find(a => a.name.toLowerCase().replace(/[\s\-_]/g, '') === normTarget);
            if (acc) return acc.name;
        }

        // 4. Try matching using digits (e.g. "308" or "boi-308")
        let digitsMatch = targetStr.match(/\d{3,}/) || fullText.match(/\d{3,}/);
        if (digitsMatch) {
            let digits = digitsMatch[0];
            acc = state.accounts.find(a => {
                let accDigits = a.name.match(/\d{3,}/);
                return accDigits && accDigits[0] === digits;
            });
            if (acc) return acc.name;
        }

        // 5. Try matching targetStr against account name parts
        if (targetStr.length > 2) {
            acc = state.accounts.find(a => {
                let normName = a.name.toLowerCase().replace(/[\s\-_]/g, '');
                return normName.includes(normTarget) || normTarget.includes(normName);
            });
            if (acc) return acc.name;
        }

        // 6. Try matching parts of account names in user text
        for (let a of state.accounts) {
            let accWords = a.name.toLowerCase().split(/[\s\-_]/).filter(w => w.length >= 3);
            for (let word of accWords) {
                if (fullText.includes(word)) {
                    return a.name;
                }
            }
        }

        // 7. Check keywords in fullText for cash vs bank fallback
        if (fullText.includes("cash") || fullText.includes("नकद") || fullText.includes("कैश")) {
            let cashAcc = state.accounts.find(a => a.type === 'Cash') || state.accounts[0];
            if (cashAcc) return cashAcc.name;
        } else if (fullText.includes("bank") || fullText.includes("online") || fullText.includes("upi") || fullText.includes("बैंक") || fullText.includes("ऑनलाइन")) {
            let bankAcc = state.accounts.find(a => a.type === 'Bank') || state.accounts.find(a => a.type !== 'Cash') || state.accounts[0];
            if (bankAcc) return bankAcc.name;
        }

        return null;
    }

    // Local Regex Command Parser
    window.parseLocalCommand = function (text) {
        let cleanText = text.toLowerCase().trim();
        
        // 1. Client Registration check
        const clientKws = ["client", "क्लाइंट", "ग्राहक", "कस्टमर"];
        const addKws = ["add", "register", "banao", "bana do", "naya", "naye", "ऐड", "एड", "जोड़ो", "जोड़ो", "जोड़", "बना", "बनाओ"];
        
        let hasClientKw = clientKws.some(x => cleanText.includes(x));
        let hasAddKw = addKws.some(x => cleanText.includes(x));
        
        if (hasClientKw && hasAddKw) {
            let monthlyPay = 0;
            let textForName = text;
            let monthlyPayRegex = /(?:jiski|jiska|जिसकी|जिसका|की|का)?\s*(?:monthly\s+payment|monthly\s+pay|payment|salary|receivable|मंथली\s+पेमेंट|मंथली|मासिक\s+भुगतान|मासिक\s+पेमेंट|मासिक|प्रति\s+माह|पेमेंट|salary)\s*(?:hai|है)?\s*(?:₹\s*|rs\.?\s*)?(\d{3,8})(?:\s*(?:hai|है))?/i;
            let match = cleanText.match(monthlyPayRegex);
            if (match) {
                monthlyPay = parseInt(match[1], 10);
                let matchedStr = match[0];
                let idx = cleanText.indexOf(matchedStr);
                if (idx !== -1) {
                    textForName = text.substring(0, idx) + text.substring(idx + matchedStr.length);
                }
            }
            
            let name = "";
            let cleanTextForName = textForName.toLowerCase().trim();
            if (cleanTextForName.includes("नाम से") || cleanTextForName.includes("name se")) {
                let sep = cleanTextForName.includes("के नाम से") ? "के नाम से" : (cleanTextForName.includes("name se") ? "name se" : "नाम से");
                let parts = textForName.split(new RegExp(sep, 'i'));
                if (parts[0]) {
                    name = cleanClientName(parts[0]);
                }
            }
            
            if (!name) {
                const indicators = ["name hai", "naam hai", "name is", "naam is", "client ka name", "client ka naam", "नाम है", "नाम", "नाम:"];
                for (let ind of indicators) {
                    if (cleanTextForName.includes(ind)) {
                        let parts = textForName.split(new RegExp(ind, 'i'));
                        if (parts.length > 1 && parts[1]) {
                            name = cleanClientName(parts[1]);
                            break;
                        }
                    }
                }
            }
            
            if (!name) {
                name = cleanClientName(textForName);
            }
            
            if (name.length > 2) {
                return {
                    action: "addClient",
                    name: name,
                    monthlyPay: monthlyPay
                };
            }
        }
        
        // 2. Expense & Income Check
        let allNumbers = cleanText.match(/\b\d{2,7}\b/g);
        if (allNumbers && allNumbers.length > 0) {
            let amount = null;
            let accountDigits = null;

            // Step A: Identify currency-associated amount
            let currencyPattern = /(?:rs\.?\s*|₹\s*)?(\d{2,7})\s*(?:rs|rupees|rupay|रुपए|रुपये|rupe|rupi|₹)/i;
            let currMatch = cleanText.match(currencyPattern);
            if (!currMatch) {
                // Check prefix currency symbol
                currMatch = cleanText.match(/(?:rs\.?\s*|₹\s*)(\d{2,7})/i);
            }
            if (currMatch) {
                amount = parseInt(currMatch[1], 10);
            }

            // Step B: Match bank account digits from state_accounts
            let matchedAcc = null;
            if (typeof state !== 'undefined' && state.accounts) {
                for (let acc of state.accounts) {
                    let accName = acc.name.toLowerCase();
                    if (cleanText.includes(accName)) {
                        matchedAcc = acc;
                        break;
                    }
                    
                    let accDigitsMatch = acc.name.match(/\d{3,}/);
                    if (accDigitsMatch) {
                        let digits = accDigitsMatch[0];
                        if (cleanText.includes(digits)) {
                            accountDigits = digits;
                            matchedAcc = acc;
                            break;
                        }
                    }
                }
                
                // Smart word-based matching if not matched yet
                if (!matchedAcc) {
                    for (let acc of state.accounts) {
                        let accWords = acc.name.toLowerCase().split(/[\s\-_]/).filter(w => w.length >= 3);
                        for (let word of accWords) {
                            if (cleanText.includes(word)) {
                                matchedAcc = acc;
                                break;
                            }
                        }
                        if (matchedAcc) break;
                    }
                }
            }

            // Step C: Resolve amount if not found by currency pattern
            if (amount === null) {
                if (allNumbers.length === 1) {
                    amount = parseInt(allNumbers[0], 10);
                } else if (allNumbers.length > 1) {
                    let remainingNums = allNumbers.filter(n => n !== accountDigits);
                    if (remainingNums.length > 0) {
                        amount = parseInt(remainingNums.reduce((max, n) => parseInt(n, 10) > parseInt(max, 10) ? n : max), 10);
                    } else {
                        amount = parseInt(allNumbers[0], 10);
                    }
                }
            }

            if (amount !== null) {
                const incomeKws = [
                    "received", "receive", "recieved", "income", "mile", "mila", "aaye", "jama", "credit", "credited",
                    "रिसीव", "रिसीव्ड", "प्राप्त", "मिले", "मिला", "आए", "आए हैं", "जमा", "जमा करो", "क्रेडिट"
                ];
                let isIncome = incomeKws.some(x => cleanText.includes(x));

                // Step D: Parse date
                let parsedDate = parseDateFromText(cleanText);

                if (isIncome) {
                    // Income parsing
                    let clientNameVal = "";
                    
                    // 1. Space-insensitive existing clients matching
                    if (typeof state !== 'undefined' && state.clients) {
                        let cleanInputNoSpaces = cleanText.replace(/\s+/g, "");
                        for (let client of state.clients) {
                            let cleanCName = client.name.toLowerCase().replace(/\s+/g, "");
                            if (cleanInputNoSpaces.includes(cleanCName)) {
                                clientNameVal = client.name;
                                break;
                            }
                        }

                        // 2. Fuzzy client name match with typo tolerance
                        if (!clientNameVal) {
                            for (let client of state.clients) {
                                let clientWords = client.name.toLowerCase().split(/\s+/).filter(w => w.length > 3);
                                for (let word of clientWords) {
                                    let typoVersions = [
                                        word,
                                        word.replace('shna', 'shan'),
                                        word.replace('shan', 'shna'),
                                        word.replace('narayan', 'naryan'),
                                        word.replace('premnarayan', 'premnaryan')
                                    ];
                                    if (typoVersions.some(tv => cleanText.includes(tv))) {
                                        clientNameVal = client.name;
                                        break;
                                    }
                                }
                                if (clientNameVal) break;
                            }
                        }
                    }

                    // 3. Fallback to regex patterns
                    if (!clientNameVal) {
                        let fromMatch = cleanText.match(/(?:from|received\s+from)\s+([a-z0-9\s\u0900-\u097F]+)/i);
                        if (fromMatch && fromMatch[1]) {
                            clientNameVal = fromMatch[1];
                        } else {
                            let seMatch = cleanText.match(/([a-z0-9\s\u0900-\u097F]+?)\s*(?:se|से|dwara|द्वारा)/i);
                            if (seMatch && seMatch[1]) {
                                clientNameVal = seMatch[1];
                            }
                        }
                    }

                    if (clientNameVal) {
                        clientNameVal = cleanClientName(clientNameVal);
                        clientNameVal = clientNameVal.replace(/\b\d+\b/g, "").trim();
                        clientNameVal = clientNameVal.split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
                    }

                    let mode = matchedAcc ? matchedAcc.id : "acc_2";
                    if (!matchedAcc && typeof state !== 'undefined' && state.accounts) {
                        let cashAccount = state.accounts.find(a => a.type === 'Cash') || state.accounts[0];
                        let bankAccount = state.accounts.find(a => a.type === 'Bank') || state.accounts[1] || state.accounts[0];
                        if (cleanText.includes("cash") || cleanText.includes("नकद") || cleanText.includes("कैश")) {
                            mode = cashAccount ? cashAccount.id : "acc_1";
                        } else {
                            mode = bankAccount ? bankAccount.id : "acc_2";
                        }
                    }

                    let res = {
                        action: "addIncome",
                        amount: amount,
                        mode: mode,
                        clientName: clientNameVal
                    };
                    if (parsedDate) res.date = parsedDate;
                    return res;
                } else {
                    // Expense parsing
                    let category = "Others";
                    let dynamicCats = (typeof state !== 'undefined' && state.categoriesConfig) ? Object.keys(state.categoriesConfig) : ["Food", "Shopping", "Bills", "Transport", "Rent", "Others"];
                    
                    const transportSynonyms = ["transport", "travelling", "travel", "taxi", "cab", "auto", "petrol", "diesel", "fuel", "ट्रेवल", "ट्रैवल", "किराया", "यात्रा"];
                    const foodSynonyms = ["food", "restaurant", "lunch", "dinner", "breakfast", "tea", "coffee", "chai", "mithai", "खाना", "चाय", "नाश्ता", "मिठाई"];
                    const billsSynonyms = ["bill", "electricity", "water", "internet", "recharge", "mobile", "wifi", "light", "बिल", "रिचार्ज", "बिजली"];
                    const rentSynonyms = ["rent", "office rent", "room rent", "shop rent", "किराया", "भाड़ा"];
                    const shoppingSynonyms = ["shopping", "clothes", "groceries", "purchase", "खरीदारी", "सामान"];
                    
                    let matchedCat = "";
                    if (transportSynonyms.some(s => cleanText.includes(s)) && dynamicCats.includes("Transport")) {
                        matchedCat = "Transport";
                    } else if (foodSynonyms.some(s => cleanText.includes(s)) && dynamicCats.includes("Food")) {
                        matchedCat = "Food";
                    } else if (billsSynonyms.some(s => cleanText.includes(s)) && dynamicCats.includes("Bills")) {
                        matchedCat = "Bills";
                    } else if (rentSynonyms.some(s => cleanText.includes(s)) && dynamicCats.includes("Rent")) {
                        matchedCat = "Rent";
                    } else if (shoppingSynonyms.some(s => cleanText.includes(s)) && dynamicCats.includes("Shopping")) {
                        matchedCat = "Shopping";
                    }
                    
                    if (matchedCat) {
                        category = matchedCat;
                    } else {
                        for (let cat of dynamicCats) {
                            if (cleanText.includes(cat.toLowerCase()) || (cat === "Others" && cleanText.includes("misc"))) {
                                category = cat;
                                break;
                            }
                        }
                    }

                    // Client allocation parsing
                    let clientNameVal = "";
                    let allocMatchAfter = cleanText.match(/(?:allocate\s+fund\s+to|allocate\s+to|allocation\s+to|fund\s+allocate\s+to|को\s+आवंटित|आवंटन)\s*([a-z0-9\s\u0900-\u097F]+)/i);
                    let allocMatchBefore = cleanText.match(/([a-z0-9\s\u0900-\u097F]+?)\s*(?:se\s+fund\s+allocate|se\s+allocate|fund\s+allocate|के\s+फंड|से\s+फंड)/i);
                    
                    if (allocMatchAfter && allocMatchAfter[1]) {
                        clientNameVal = allocMatchAfter[1];
                    } else if (allocMatchBefore && allocMatchBefore[1]) {
                        clientNameVal = allocMatchBefore[1];
                    }
                    
                    if (clientNameVal) {
                        clientNameVal = cleanClientName(clientNameVal);
                        clientNameVal = clientNameVal.replace(/\b\d+\b/g, "").trim();
                        clientNameVal = clientNameVal.split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
                    }
                    
                    let mode = matchedAcc ? matchedAcc.id : "acc_1";
                    if (!matchedAcc && typeof state !== 'undefined' && state.accounts) {
                        let cashAccount = state.accounts.find(a => a.type === 'Cash') || state.accounts[0];
                        let bankAccount = state.accounts.find(a => a.type === 'Bank') || state.accounts[1] || state.accounts[0];
                        if (cleanText.includes("cash") || cleanText.includes("नकद") || cleanText.includes("कैश")) {
                            mode = cashAccount ? cashAccount.id : "acc_1";
                        } else if (cleanText.includes("bank") || cleanText.includes("online") || cleanText.includes("बैंक") || cleanText.includes("ऑनलाइन")) {
                            mode = bankAccount ? bankAccount.id : "acc_2";
                        } else {
                            mode = cashAccount ? cashAccount.id : "acc_1";
                        }
                    }

                    let desc = text;
                    const kws = ["shree", "sindhu", "ai", "karo", "karein", "add", "kar do", "me", "par", "under", "date", "kharch", "expense", "exp", "rupees", "rs", "rupay", "hua", "hai", "allocate", "fund", "to", "paid", "from", "se", "cash", "bank"];
                    for (let kw of kws) {
                        desc = desc.replace(new RegExp("\\b" + kw + "\\b", "gi"), "");
                    }
                    if (clientNameVal) {
                        desc = desc.replace(new RegExp(clientNameVal, "gi"), "");
                    }
                    desc = desc.replace(new RegExp(amount.toString(), "g"), "");
                    desc = desc.replace(new RegExp(category, "gi"), "");
                    desc = desc.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "");
                    desc = desc.replace(/\s+/g, " ").trim();
                    if (!desc) {
                        desc = "Expense Entry";
                    }

                    let res = {
                        action: "addExpense",
                        description: desc,
                        category: category,
                        amount: amount,
                        mode: mode,
                        clientName: clientNameVal
                    };
                    if (parsedDate) res.date = parsedDate;
                    return res;
                }
            }
        }
        
        return null;
    };

    // Local Navigation Parser
    function parseNavigationCommand(text) {
        let cleanText = text.toLowerCase().trim();
        
        // Define strong/specific page keywords
        const strongClientsKws = ["client directory", "clients & income", "clients and income", "clients page", "clients tab", "client page", "client list", "क्लाइंट डायरेक्टरी", "क्लाइंट्स डायरेक्टरी", "क्लाइंट्स एंड इनकम", "क्लाइंट पेज", "क्लाइंट टैब", "डायरेक्टरी"];
        const strongEntriesKws = ["entries page", "transactions page", "expenses tab", "expense entry screen", "एंट्री स्क्रीन", "एंट्री पेज", "ट्रांजैक्शन स्क्रीन", "ट्रांजैक्शन पेज", "खर्चे स्क्रीन"];
        const strongReportsKws = ["reports page", "reports tab", "bookkeeping report", "रिपोर्ट स्क्रीन", "बहीखाता स्क्रीन", "मंथली रिपोर्ट", "मंथली समरी", "क्लाइंट रिपोर्ट", "अकाउंट्स लेजर"];
        const strongMasterKws = ["master settings", "settings page", "मास्टर सेटिंग्स", "सेटिंग्स पेज", "खाता सेटिंग", "खाता सेटअप", "कैटेगरी सेटिंग्स", "स्टाफ डायरेक्टरी"];

        // List of all strong keywords to remove before checking for tx/update keywords
        const allStrongKws = [...strongClientsKws, ...strongEntriesKws, ...strongReportsKws, ...strongMasterKws, "client report", "क्लाइंट रिपोर्ट", "detail report", "विवरण"];

        // Temporarily remove strong keywords to check if remaining text contains tx/update cues
        let textForChecking = cleanText;
        for (let kw of allStrongKws) {
            textForChecking = textForChecking.replace(new RegExp(kw, 'g'), "");
        }

        // 1. Check for transaction/mutation indicators in the remaining text
        const hasAmount = /\b\d{3,}\b/.test(textForChecking) || 
                          textForChecking.includes("thousand") || textForChecking.includes("हजार") || 
                          textForChecking.includes("lakh") || textForChecking.includes("लाख") ||
                          textForChecking.includes("rs") || textForChecking.includes("rupees") || textForChecking.includes("rupay") || textForChecking.includes("रुपए") || textForChecking.includes("रुपये");
        
        const txKeywords = [
            "receive", "received", "payment", "pay", "paid", "expense", "income", 
            "kharch", "kharcha", "diye", "liye", "mila", "mile", "dene", "lene", "jama", "nikale",
            "रिसीव", "पेमेंट", "पे", "खर्च", "खर्चा", "दिए", "लिए", "मिला", "मिले", "जमा", "निकाले",
            "add client", "client add", "new client", "नया क्लाइंट", "add kar", "add kardo", "add krdo", 
            "जोड़ो", "जोड़ो", "जोड़", "जोड़"
        ];
        const hasTxKeyword = txKeywords.some(kw => textForChecking.includes(kw));

        // 2. Check for code modification / app update indicators in the remaining text
        const updateKeywords = [
            "edit", "delete", "button", "visible", "css", "js", "html", "code", "file", "ui", 
            "styling", "layout", "style", "script", "font", "color", "background", "margin", "padding",
            "बटन", "दिखा", "दिखाई", "बदलो", "बदलें", "चेंज", "change", "modify", "update", "अपडेट"
        ];
        const hasUpdateKeyword = updateKeywords.some(kw => textForChecking.includes(kw));

        if (hasAmount || hasTxKeyword || hasUpdateKeyword) {
            return null;
        }

        // 3. Check navigation verbs and context words
        const navVerbs = [
            "open", "go to", "go", "show", "view", "check", "navigate", "display", "switch",
            "kholo", "jao", "dikhao", "check karo", "khool", "chala", "open kar", "kholna",
            "खोलना", "खोल", "खोलो", "खोलें", "जाना", "जाओ", "जा", "दिखाना", "दिखाओ", "दिखा", 
            "देखना", "देखो", "चेक", "चल", "चलो"
        ];
        const navContexts = [
            "tab", "page", "screen", "directory", "list", "section", "view",
            "टैब", "पेज", "स्क्रीन", "डायरेक्टरी", "लिस्ट", "सेक्शन", "विवरण"
        ];

        const hasNavVerb = navVerbs.some(v => cleanText.includes(v));
        const hasNavContext = navContexts.some(c => cleanText.includes(c));
        const hasNavIntent = hasNavVerb || hasNavContext;

        const dashboardKws = ["dashboard", "home", "main screen", "डैशबोर्ड", "होम", "मुख्य"];
        const clientsKws = ["client", "income", "क्लाइंट", "इनकम"];
        const entriesKws = ["entries", "transactions", "expenses", "expense entry", "एंट्री", "ट्रांजैक्शन", "खर्चे"];
        const reportsKws = ["reports", "report", "bookkeeping", "रिपोर्ट", "बहीखाता", "bahikhata", "bahi khata"];
        const masterKws = ["settings", "master", "मास्टर", "सेटिंग्स"];

        // 1. Specific ledger accounts or client reports
        if (cleanText.includes("ledger") || cleanText.includes("लेजर") || cleanText.includes("खाता")) {
            if (typeof state !== 'undefined' && state.accounts) {
                for (let acc of state.accounts) {
                    let accName = acc.name.toLowerCase();
                    if (cleanText.includes(accName)) {
                        if (hasNavIntent || cleanText.includes("ledger") || cleanText.includes("लेजर")) {
                            return { action: "navigate", target: "ledger-account", value: acc.id };
                        }
                    }
                }
            }
        }
        
        if (cleanText.includes("client report") || cleanText.includes("क्लाइंट रिपोर्ट") || cleanText.includes("detail report") || cleanText.includes("विवरण")) {
            if (typeof state !== 'undefined' && state.clients) {
                for (let client of state.clients) {
                    let clientName = client.name.toLowerCase();
                    if (cleanText.includes(clientName)) {
                        return { action: "navigate", target: "client-report", value: client.id };
                    }
                }
            }
        }

        // 2. Reports sub-screens
        if (cleanText.includes("client report") || cleanText.includes("क्लाइंट रिपोर्ट") || cleanText.includes("क्लाइंट समरी")) {
            return { action: "navigate", target: "reports-client" };
        }
        if (cleanText.includes("monthly") || cleanText.includes("मंथली समरी") || cleanText.includes("मंथली रिपोर्ट") || cleanText.includes("मासिक")) {
            return { action: "navigate", target: "reports-monthly" };
        }
        if (cleanText.includes("ledger") || cleanText.includes("लेजर")) {
            return { action: "navigate", target: "reports-ledger" };
        }

        // 3. Master / Settings sub-panels
        if (cleanText.includes("member") || cleanText.includes("स्टाफ") || cleanText.includes("मेंबर्स") || cleanText.includes("user")) {
            return { action: "navigate", target: "master-members" };
        }
        if (cleanText.includes("category") || cleanText.includes("कैटेगरी") || cleanText.includes("head") || cleanText.includes("हेड")) {
            return { action: "navigate", target: "master-categories" };
        }
        if (cleanText.includes("client config") || cleanText.includes("client setting") || cleanText.includes("क्लाइंट सेटिंग") || cleanText.includes("क्लाइंट कॉन्फ़िगरेशन")) {
            return { action: "navigate", target: "master-clients-config" };
        }
        if (cleanText.includes("account setup") || cleanText.includes("account setting") || cleanText.includes("खाता सेटिंग") || cleanText.includes("खाता सेटअप")) {
            return { action: "navigate", target: "master-accounts" };
        }

        // 4. Main Pages
        if (dashboardKws.some(k => cleanText.includes(k))) return { action: "navigate", target: "dashboard" };
        if (strongClientsKws.some(k => cleanText.includes(k)) || (hasNavIntent && clientsKws.some(k => cleanText.includes(k)))) return { action: "navigate", target: "clients" };
        if (strongEntriesKws.some(k => cleanText.includes(k)) || (hasNavIntent && entriesKws.some(k => cleanText.includes(k)))) return { action: "navigate", target: "expenses" };
        if (strongReportsKws.some(k => cleanText.includes(k)) || (hasNavIntent && reportsKws.some(k => cleanText.includes(k)))) return { action: "navigate", target: "reports" };
        if (strongMasterKws.some(k => cleanText.includes(k)) || (hasNavIntent && masterKws.some(k => cleanText.includes(k)))) return { action: "navigate", target: "master" };

        return null;
    }

    // Execute Database & App Action
    function executeAgentAction(parsed) {
        if (!parsed) return { success: false, error: "could not parse" };
        
        if (parsed.action === 'navigate') {
            try {
                if (parsed.target === 'dashboard') {
                    if (typeof navigateToPage === 'function') navigateToPage('dashboard');
                } else if (parsed.target === 'clients') {
                    if (typeof navigateToPage === 'function') navigateToPage('clients');
                } else if (parsed.target === 'expenses') {
                    if (typeof navigateToPage === 'function') navigateToPage('expenses');
                } else if (parsed.target === 'reports') {
                    if (typeof navigateToPage === 'function') navigateToPage('reports');
                } else if (parsed.target === 'master') {
                    if (typeof navigateToPage === 'function') navigateToPage('master');
                } else if (parsed.target === 'reports-client') {
                    if (typeof navigateToPage === 'function') navigateToPage('reports');
                    if (typeof setReportType === 'function') setReportType('client');
                } else if (parsed.target === 'reports-monthly') {
                    if (typeof navigateToPage === 'function') navigateToPage('reports');
                    if (typeof setReportType === 'function') setReportType('monthly');
                } else if (parsed.target === 'reports-ledger') {
                    if (typeof navigateToPage === 'function') navigateToPage('reports');
                    if (typeof setReportType === 'function') setReportType('ledger');
                } else if (parsed.target === 'master-accounts') {
                    if (typeof navigateToPage === 'function') navigateToPage('master');
                    if (typeof setMasterTab === 'function') setMasterTab('accounts');
                } else if (parsed.target === 'master-clients-config') {
                    if (typeof navigateToPage === 'function') navigateToPage('master');
                    if (typeof setMasterTab === 'function') setMasterTab('clients-config');
                } else if (parsed.target === 'master-categories') {
                    if (typeof navigateToPage === 'function') navigateToPage('master');
                    if (typeof setMasterTab === 'function') setMasterTab('categories');
                } else if (parsed.target === 'master-members') {
                    if (typeof navigateToPage === 'function') navigateToPage('master');
                    if (typeof setMasterTab === 'function') setMasterTab('members');
                } else if (parsed.target === 'ledger-account' && parsed.value) {
                    if (typeof window.navigateToLedgerAccount === 'function') {
                        window.navigateToLedgerAccount(parsed.value);
                    }
                } else if (parsed.target === 'client-report' && parsed.value) {
                    if (typeof window.navigateToClientReport === 'function') {
                        window.navigateToClientReport(parsed.value);
                    }
                }
                return { success: true, message: `Navigated to ${parsed.target}` };
            } catch (navErr) {
                console.error("Navigation action failed:", navErr);
                return { success: false, error: navErr.message };
            }
        }

        if (parsed.action === 'addClient') {
            const clientObj = {
                id: 'c_' + Date.now(),
                name: parsed.name,
                monthlyPay: parsed.monthlyPay || 0
            };
            if (typeof state !== 'undefined' && state.customClientFields) {
                state.customClientFields.forEach(f => {
                    clientObj[f.name] = f.type === 'number' ? 0 : '';
                });
            }
            if (typeof addClientDirect === 'function') {
                addClientDirect(clientObj);
            }
            return { success: true, message: `Client "${clientObj.name}" created successfully.`, data: clientObj };
        }
        
        if (parsed.action === 'addExpense') {
            let clientId = '';
            if (parsed.clientName && typeof state !== 'undefined') {
                let client = state.clients.find(c => c.name.toLowerCase() === parsed.clientName.toLowerCase());
                if (!client) {
                    client = {
                        id: 'c_' + Date.now(),
                        name: parsed.clientName,
                        monthlyPay: 0
                    };
                    if (state.customClientFields) {
                        state.customClientFields.forEach(f => {
                            client[f.name] = f.type === 'number' ? 0 : '';
                        });
                    }
                    if (typeof addClientDirect === 'function') {
                        addClientDirect(client);
                    }
                }
                clientId = client.id;
            }
            
            let dateStr = parsed.date;
            if (!dateStr) {
                const localDate = new Date();
                const year = localDate.getFullYear();
                const month = String(localDate.getMonth() + 1).padStart(2, '0');
                const day = String(localDate.getDate()).padStart(2, '0');
                dateStr = `${year}-${month}-${day}`;
            }

            let modeName = '';
            if (typeof state !== 'undefined' && state.accounts) {
                modeName = resolveAccountName(parsed.mode, parsed.originalText || parsed.description || '');
            }
            if (!modeName && typeof state !== 'undefined' && state.accounts) {
                let cashAccount = state.accounts.find(a => a.type === 'Cash') || state.accounts[0];
                modeName = cashAccount ? cashAccount.name : 'Main Cash';
            }
            if (!modeName) modeName = 'Main Cash';
            
            const txObj = {
                id: 't_' + Date.now(),
                description: parsed.description || 'Expense Entry',
                category: parsed.category || 'Others',
                amount: parsed.amount,
                date: dateStr,
                mode: modeName,
                clientId: clientId
            };
            
            if (typeof state !== 'undefined' && state.customTxFields) {
                state.customTxFields.forEach(f => {
                    txObj[f.name] = f.type === 'number' ? 0 : '';
                });
            }
            
            if (typeof addExpenseDirect === 'function') {
                addExpenseDirect(txObj);
            }
            return { success: true, message: `Expense of ₹${txObj.amount} recorded.`, data: txObj };
        }
        
        if (parsed.action === 'addIncome') {
            let clientId = '';
            if (parsed.clientName && typeof state !== 'undefined') {
                let client = state.clients.find(c => c.name.toLowerCase() === parsed.clientName.toLowerCase());
                if (!client) {
                    client = {
                        id: 'c_' + Date.now(),
                        name: parsed.clientName,
                        monthlyPay: 0
                    };
                    if (state.customClientFields) {
                        state.customClientFields.forEach(f => {
                            client[f.name] = f.type === 'number' ? 0 : '';
                        });
                    }
                    if (typeof addClientDirect === 'function') {
                        addClientDirect(client);
                    }
                }
                clientId = client.id;
            } else if (typeof state !== 'undefined') {
                let client = state.clients[0];
                if (!client) {
                    client = {
                        id: 'c_' + Date.now(),
                        name: 'General Client',
                        monthlyPay: 0
                    };
                    if (typeof addClientDirect === 'function') {
                        addClientDirect(client);
                    }
                }
                clientId = client.id;
            }
            
            let dateStr = parsed.date;
            if (!dateStr) {
                const localDate = new Date();
                const year = localDate.getFullYear();
                const month = String(localDate.getMonth() + 1).padStart(2, '0');
                const day = String(localDate.getDate()).padStart(2, '0');
                dateStr = `${year}-${month}-${day}`;
            }

            let modeName = '';
            if (typeof state !== 'undefined' && state.accounts) {
                modeName = resolveAccountName(parsed.mode, parsed.originalText || '');
            }
            if (!modeName && typeof state !== 'undefined' && state.accounts) {
                let bankAccount = state.accounts.find(a => a.type === 'Bank') || state.accounts[1] || state.accounts[0];
                modeName = bankAccount ? bankAccount.name : 'HDFC Bank';
            }
            if (!modeName) modeName = 'HDFC Bank';
            
            const logObj = {
                id: 'i_' + Date.now(),
                clientId: clientId,
                amount: parsed.amount,
                date: dateStr,
                mode: modeName
            };
            
            if (typeof state !== 'undefined' && state.customClientFields) {
                state.customClientFields.forEach(f => {
                    logObj[f.name] = f.type === 'number' ? 0 : '';
                });
            }
            
            if (typeof addIncomeDirect === 'function') {
                addIncomeDirect(logObj);
            }
            return { success: true, message: `Income of ₹${logObj.amount} recorded.`, data: logObj };
        }
        
        return { success: false, error: "unknown action" };
    }

    // Helper: Fetch Gemini API with Retry and Model Fallback
    async function fetchGeminiWithRetry(requestBody, apiKey, maxRetries = 3, initialDelay = 1000) {
        const models = ["gemini-2.5-flash", "gemini-1.5-flash"];
        let lastError = null;

        for (let model of models) {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
            let retries = 0;
            
            while (true) {
                try {
                    const response = await fetch(url, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify(requestBody)
                    });

                    if (response.ok) {
                        const data = await response.json();
                        const textResult = data.candidates?.[0]?.content?.parts?.[0]?.text;
                        if (!textResult) {
                            throw new Error("Empty response from Gemini API");
                        }
                        return textResult;
                    }

                    // Retry on transient errors: 429, 503, 504
                    if (response.status === 429 || response.status === 503 || response.status === 504) {
                        if (retries < maxRetries) {
                            retries++;
                            const delay = initialDelay * Math.pow(2, retries - 1);
                            console.warn(`Gemini API call failed with status ${response.status} using model ${model}. Retrying in ${delay}ms (retry ${retries}/${maxRetries})...`);
                            await new Promise(resolve => setTimeout(resolve, delay));
                            continue;
                        }
                    }

                    // If model is not supported (404/400), try fallback model
                    if (response.status === 404 || response.status === 400) {
                        console.warn(`Model ${model} might not be supported (status ${response.status}). Trying fallback...`);
                        lastError = new Error(`Gemini API Error: Status ${response.status}`);
                        break;
                    }

                    throw new Error(`Gemini API Error: Status ${response.status}`);
                } catch (err) {
                    if (retries < maxRetries && (err.message.includes('Failed to fetch') || err.name === 'TypeError')) {
                        retries++;
                        const delay = initialDelay * Math.pow(2, retries - 1);
                        console.warn(`Gemini network error: ${err.message}. Retrying in ${delay}ms (retry ${retries}/${maxRetries})...`);
                        await new Promise(resolve => setTimeout(resolve, delay));
                        continue;
                    }
                    lastError = err;
                    break;
                }
            }
        }
        throw lastError || new Error("Failed to communicate with Gemini API");
    }

    // Call Gemini API
    async function callGeminiAI(inputText, apiKey) {
        const cats = (typeof state !== 'undefined' && state.categoriesConfig) ? Object.keys(state.categoriesConfig) : ["Food", "Shopping", "Bills", "Transport", "Rent", "Others"];
        const accs = (typeof state !== 'undefined' && state.accounts) ? state.accounts.map(a => `${a.name} (ID: ${a.id}, type: ${a.type})`).join(', ') : "Main Cash (ID: acc_1), HDFC Bank (ID: acc_2)";
        
        const systemPrompt = `You are Sindhu (सिन्धु), a highly experienced and professional female assistant, bookkeeper, and developer agent for the Wealth Plus app.
Your task is to parse the user's voice or text command (which will be in Hindi, English, or Hinglish) and structure it into a database action, an application code modification action, a navigation action, or a general conversational response.
Always behave and respond like a real human lady (friendly, polite, but completely conversational). Use modern conversational Hinglish (Hindi mixed with common English terms like 'monthly payment', 'new client', 'expense', 'save', 'add', 'receive', 'problem', 'please').
CRITICAL: Do NOT use overly formal, robotic, or dramatic words like "कृपया", "महोदय", "महोदया", "हुज़ूर", "प्रसन्नता", "अत्यंत आदरपूर्वक", "सहेज लिया है". Keep it natural and modern.

Available Categories: ${cats.join(', ')}
Available Accounts: ${accs}

Guidelines:
1. For Client registration (e.g. "naya client balkrishna premnarayan add kar do"):
   Identify client name and optional monthly payment.
   -> action: "addClient", name: "Balkrishna Premnarayan", monthlyPay: 25000 (if mentioned).
2. For Expense logging (e.g. "10000 travelling expenses paid from cash, allocate to Balkrishna Premnarayan"):
   Identify amount, category (mapped to one of: ${cats.join(', ')}), mode (an account ID like acc_1 or acc_2), client allocation name (clientName), and description.
   -> action: "addExpense", amount: 10000, category: "Transport", mode: "acc_1", clientName: "Balkrishna Premnarayan", description: "Travelling expenses".
3. For Income logging (e.g. "received 50000 from Balkrishna Premnarayan via bank"):
   Identify amount, source client, and mode (account ID).
   -> action: "addIncome", amount: 50000, clientName: "Balkrishna Premnarayan", mode: "acc_2".
4. For Application code updates/modifications (e.g., "change UI styling to purple", "change dashboard title in index.html", "modify app.js to add custom logging"):
   Identify the target file and the instruction for change.
   -> action: "updateApp", targetFile: "style.css" or "index.html" or "app.js" or "sindhu_v1.js", instructionForChange: "The user instructions details".
5. For Application Screen Navigation (e.g., "dashboard open karo", "go to clients page", "clients & income tab open karo", "monthly reports analysis screen pe jao", "hdfc bank ledger account detail open karo"):
   Identify the target navigation screen.
   -> action: "navigate", target: "dashboard" or "clients" or "expenses" or "reports" or "master" or "reports-client" or "reports-monthly" or "reports-ledger" or "master-accounts" or "master-clients-config" or "master-categories" or "master-members" or "ledger-account" or "client-report".
   - If user asks for a specific ledger account (e.g. "hdfc bank ledger check karo"): set target = "ledger-account" and value = "acc_2" (or the account's name or ID).
   - If user asks for client reports of a specific client (e.g. "Acme Corporation client report open karo"): set target = "client-report" and value = "Acme Corporation" (or client name/ID).
6. For General Conversation/Chat (e.g., "hello sindhu", "kaise ho?", "what can you do?"):
   -> action: "chat", replyHindi: "जय हरी! मैं अच्छी हूँ, बताइए आज बहीखाते में क्या एंट्री करनी है?"
7. Generate a warm, natural lady-like Hindi/Hinglish spoken confirmation (replyHindi). It MUST start with "जय हरी!" (e.g., "जय हरी! मैंने बालकृष्ण प्रेमनारायण को 25000 रुपये मंथली पेमेंट के साथ न्यू क्लाइंट ऐड कर दिया है। कुछ और हेल्प चाहिए?" or "जय हरी! मैंने कोड में चेंजेस शुरू कर दिए हैं।").
8. The database inputs (name, description, clientName, category) MUST be in English (Latin script). Only replyHindi must be in Devanagari Hindi (written in conversational Hinglish words).`;

        const requestBody = {
            contents: [
                {
                    parts: [
                        { text: `${systemPrompt}\n\nUser Input: "${inputText}"` }
                    ]
                }
            ],
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: "OBJECT",
                    properties: {
                        action: {
                            type: "STRING",
                            enum: ["addClient", "addExpense", "addIncome", "updateApp", "navigate", "chat", "unknown"]
                        },
                        name: { type: "STRING" },
                        monthlyPay: { type: "INTEGER" },
                        description: { type: "STRING" },
                        category: { type: "STRING" },
                        amount: { type: "INTEGER" },
                        mode: { type: "STRING" },
                        clientName: { type: "STRING" },
                        targetFile: { type: "STRING" },
                        instructionForChange: { type: "STRING" },
                        target: { type: "STRING" },
                        value: { type: "STRING" },
                        replyHindi: { type: "STRING" }
                    },
                    required: ["action", "replyHindi"]
                }
            }
        };

        const textResult = await fetchGeminiWithRetry(requestBody, apiKey);
        return JSON.parse(textResult);
    }

    // Voice synthesis setup
    function speakSindhuText(text) {
        if (!window.speechSynthesis) return;
        window.speechSynthesis.cancel(); // cancel any active speech
        
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.95;
        utterance.pitch = 1.05;
        
        const voices = window.speechSynthesis.getVoices();
        let selectedVoice = voices.find(v => v.lang.includes('hi-IN') || v.lang.includes('hi_IN'));
        if (!selectedVoice) {
            selectedVoice = voices.find(v => v.name.toLowerCase().includes('hindi') || v.name.toLowerCase().includes('google hi'));
        }
        if (!selectedVoice) {
            selectedVoice = voices.find(v => v.name.toLowerCase().includes('female') || v.name.toLowerCase().includes('google-') || v.lang.includes('en-IN'));
        }
        if (selectedVoice) {
            utterance.voice = selectedVoice;
        }
        
        window.speechSynthesis.speak(utterance);
    }

    // Advanced: Generate modified code for app files using Gemini API (Search & Replace blocks)
    async function generateModifiedCode(fileName, currentCode, instructions, apiKey) {
        const prompt = `You are a professional web developer agent.
Your task is to modify the file "${fileName}" based on the following instructions:
"${instructions}"

Identify the exact contiguous block of code that needs to be replaced in the current file.
Return a JSON object containing:
1. "targetContent": The exact contiguous block of code to search for in the current file. It must match exactly (including leading indentation spaces, newlines, and capitalization) and be unique to avoid replacing the wrong block.
2. "replacementContent": The replacement code for that block.

Format the response strictly as a JSON object, containing nothing else. Do not wrap in markdown code blocks.`;

        const requestBody = {
            contents: [
                {
                    parts: [
                        { text: prompt },
                        { text: `Current Code of ${fileName}:\n\n${currentCode}` }
                    ]
                }
            ],
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: "OBJECT",
                    properties: {
                        targetContent: { type: "STRING" },
                        replacementContent: { type: "STRING" }
                    },
                    required: ["targetContent", "replacementContent"]
                }
            }
        };

        const textResult = await fetchGeminiWithRetry(requestBody, apiKey);
        const parsedJson = JSON.parse(textResult.trim());
        if (!parsedJson.targetContent || parsedJson.replacementContent === undefined) {
            throw new Error("Invalid format returned by Gemini API");
        }

        const target = parsedJson.targetContent;
        const replacement = parsedJson.replacementContent;

        if (!currentCode.includes(target)) {
            console.warn("Exact match not found for targetContent. Trying trimmed match...");
            // Try matching without trailing spaces
            const trimmedTarget = target.trim();
            if (trimmedTarget && currentCode.includes(trimmedTarget)) {
                // Find start and end indices of trimmed target to match exactly
                return currentCode.replace(trimmedTarget, replacement);
            }
            throw new Error("Could not find the target code block in the file for replacement. Please try again with a more specific description.");
        }

        return currentCode.replace(target, replacement);
    }

    // Initialize Widget Event Listeners
    function initSindhuWidget() {
        const toggleBtn = document.getElementById("sindhu-toggle-btn");
        const closeBtn = document.getElementById("sindhu-btn-close");
        const chatWindow = document.getElementById("sindhu-chat-window");
        const chatInput = document.getElementById("sindhu-input");
        const sendBtn = document.getElementById("sindhu-send-btn");
        const micBtn = document.getElementById("sindhu-mic-btn");
        const messagesDiv = document.getElementById("sindhu-messages");
        
        const settingsBtn = document.getElementById("sindhu-btn-settings");
        const settingsPanel = document.getElementById("sindhu-settings");
        const settingsBackBtn = document.getElementById("sindhu-settings-back");
        const geminiKeyInput = document.getElementById("sindhu-gemini-key");
        const voiceReplyCheckbox = document.getElementById("sindhu-voice-reply");

        // Load saved settings
        if (typeof state !== 'undefined' && state.geminiApiKey) {
            geminiKeyInput.value = state.geminiApiKey;
        }
        if (localStorage.getItem("sindhu_voice_reply") !== null) {
            voiceReplyCheckbox.checked = localStorage.getItem("sindhu_voice_reply") === "true";
        }

        function syncBodyChatClass() {
            if (chatWindow && chatWindow.classList.contains("active")) {
                document.body.classList.add("sindhu-chat-active");
            } else {
                document.body.classList.remove("sindhu-chat-active");
            }
        }

        // Toggle chat window
        if (toggleBtn && chatWindow) {
            toggleBtn.addEventListener("click", () => {
                chatWindow.classList.toggle("active");
                syncBodyChatClass();
                if (chatWindow.classList.contains("active")) {
                    chatInput.focus();
                    if (typeof lucide !== 'undefined') lucide.createIcons();
                }
            });
        }

        if (closeBtn && chatWindow) {
            closeBtn.addEventListener("click", () => {
                chatWindow.classList.remove("active");
                syncBodyChatClass();
                if (window.speechSynthesis) window.speechSynthesis.cancel();
                // Clear session buffer on close
                sindhuSessionBuffer = "";
            });
        }

        // Settings actions
        if (settingsBtn && settingsPanel && messagesDiv) {
            settingsBtn.addEventListener("click", () => {
                settingsPanel.classList.toggle("active");
            });
        }
        if (settingsBackBtn && settingsPanel) {
            settingsBackBtn.addEventListener("click", () => {
                settingsPanel.classList.remove("active");
            });
        }
        if (geminiKeyInput) {
            geminiKeyInput.addEventListener("change", () => {
                if (typeof state !== 'undefined') {
                    state.geminiApiKey = geminiKeyInput.value.trim();
                    if (typeof saveState === 'function') saveState();
                }
            });
        }
        if (voiceReplyCheckbox) {
            voiceReplyCheckbox.addEventListener("change", () => {
                localStorage.setItem("sindhu_voice_reply", voiceReplyCheckbox.checked.toString());
            });
        }

        // Append message UI helper
        function appendMessage(text, sender) {
            if (!messagesDiv) return;
            const msg = document.createElement("div");
            msg.className = `sindhu-msg msg-${sender}`;
            const p = document.createElement("p");
            p.innerText = text;
            msg.appendChild(p);
            
            const timeSpan = document.createElement("span");
            timeSpan.className = "msg-time";
            const now = new Date();
            timeSpan.innerText = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;
            msg.appendChild(timeSpan);
            
            messagesDiv.appendChild(msg);
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
        }

        // Process Assistant Response
        async function processCommand(inputText) {
            if (!inputText.trim()) return;
            appendMessage(inputText, "user");
            chatInput.value = "";

            const cleanInput = inputText.toLowerCase().trim();
            const updateTriggers = ["update karo", "update krdo", "update kardo", "update", "अपडेट करो", "अपडेट"];
            const hasUpdateTrigger = updateTriggers.some(trigger => cleanInput.includes(trigger));

            // Helper to clean update triggers out of a string
            function cleanTriggers(str) {
                let s = str;
                for (let trigger of updateTriggers) {
                    s = s.replace(new RegExp(trigger, "gi"), "");
                }
                return s.replace(/\s+/g, " ").trim();
            }

            // 1. Let's first parse locally for navigation to keep it fast and 100% reliable offline
            let localNav = parseNavigationCommand(cleanInput);
            if (localNav) {
                localNav.originalText = inputText;
                const actionResult = executeAgentAction(localNav);
                if (actionResult.success) {
                    let pageName = localNav.target;
                    let replyText = `जय हरी! मैंने ${pageName} स्क्रीन ओपन कर दी है।`;
                    if (localNav.target === 'ledger-account' && typeof state !== 'undefined') {
                        let acc = state.accounts.find(a => a.id === localNav.value);
                        replyText = `जय हरी! मैंने ${acc ? acc.name : ''} का लेज़र खाता खोल दिया है।`;
                    } else if (localNav.target === 'client-report' && typeof state !== 'undefined') {
                        let client = state.clients.find(c => c.id === localNav.value);
                        replyText = `जय हरी! मैंने ${client ? client.name : ''} की डिटेल रिपोर्ट खोल दी है।`;
                    } else {
                        // Human friendly tab names mapping
                        const tabNames = {
                            'dashboard': 'डैशबोर्ड (Dashboard)',
                            'clients': 'क्लाइंट्स डायरेक्टरी (Clients & Income)',
                            'expenses': 'ट्रांजैक्शन एंट्रीज़ (Wealth Plus Entries)',
                            'reports': 'रिपोर्ट्स (Reports & Bookkeeping)',
                            'master': 'मास्टर सेटिंग्स (Master Settings)',
                            'reports-client': 'क्लाइंट रिपोर्ट्स (Client Reports)',
                            'reports-monthly': 'मंथली समरी (Monthly Summaries)',
                            'reports-ledger': 'अकाउंट्स लेजर (Accounts Ledger)',
                            'master-accounts': 'अकाउंट्स सेटअप (Accounts Setup)',
                            'master-clients-config': 'क्लाइंट्स सेटिंग्स (Clients Configuration)',
                            'master-categories': 'ट्रांजैक्शन हेड्स (Categories)',
                            'master-members': 'स्टाफ डायरेक्टरी (Members)'
                        };
                        if (tabNames[localNav.target]) {
                            replyText = `जय हरी! मैंने ${tabNames[localNav.target]} ओपन कर दिया है।`;
                        }
                    }
                    appendMessage(replyText, "sindhu");
                    if (voiceReplyCheckbox && voiceReplyCheckbox.checked) {
                        speakSindhuText(replyText);
                    }
                } else {
                    let replyText = "जय हरी! मैं नेविगेट करने की कोशिश कर रही हूँ, पर कुछ एरर आ रहा है।";
                    appendMessage(replyText, "sindhu");
                    if (voiceReplyCheckbox && voiceReplyCheckbox.checked) {
                        speakSindhuText(replyText);
                    }
                }
                return;
            }

            // 2. If not local navigation, call Gemini or local regex to parse input
            const key = geminiKeyInput ? geminiKeyInput.value.trim() : "";
            let parsed = null;

            try {
                if (key) {
                    appendMessage("Sindhu is analyzing...", "sindhu");
                    try {
                        let cleanInputForAnalysis = cleanTriggers(inputText);
                        parsed = await callGeminiAI(cleanInputForAnalysis, key);
                        // remove the placeholder
                        const loadingMsg = messagesDiv.querySelector(".sindhu-msg.msg-sindhu:last-child");
                        if (loadingMsg && loadingMsg.innerText.includes("analyzing")) {
                            loadingMsg.remove();
                        }
                    } catch (err) {
                        console.warn("Gemini parsing failed, using local parser:", err);
                        const loadingMsg = messagesDiv.querySelector(".sindhu-msg.msg-sindhu:last-child");
                        if (loadingMsg && loadingMsg.innerText.includes("analyzing")) {
                            loadingMsg.remove();
                        }
                        parsed = parseLocalCommand(cleanTriggers(inputText));
                    }
                } else {
                    parsed = parseLocalCommand(cleanTriggers(inputText));
                }
            } catch (err) {
                console.error("General parse error:", err);
            }

            // If still not parsed, treat as unknown/chat
            if (!parsed) {
                parsed = { action: "chat", replyHindi: "जय हरी! मुझे आपकी बात समझ नहीं आई। क्या आप कोई एंट्री करना चाहते हैं या नेविगेट करना चाहते हैं?" };
            }
            if (parsed) {
                parsed.originalText = inputText;
            }

            const mutations = ["addClient", "addExpense", "addIncome", "updateApp"];
            const isMutation = mutations.includes(parsed.action);

            if (isMutation) {
                if (!hasUpdateTrigger) {
                    // Buffer it
                    if (sindhuSessionBuffer) {
                        sindhuSessionBuffer += " " + inputText;
                    } else {
                        sindhuSessionBuffer = inputText;
                    }
                    const replyText = "जय हरी! हाँ जी, मैंने नोट कर लिया है। जब आपका काम पूरा हो जाए, तो प्लीज 'अपडेट करो' बोल देना।";
                    appendMessage(replyText, "sindhu");
                    if (voiceReplyCheckbox && voiceReplyCheckbox.checked) {
                        speakSindhuText(replyText);
                    }
                    return;
                } else {
                    // It is a mutation and has update trigger.
                    // Process buffer + current input
                    let fullTextToProcess = sindhuSessionBuffer ? (sindhuSessionBuffer + " " + inputText) : inputText;
                    let textToParse = cleanTriggers(fullTextToProcess);

                    // Clear buffer immediately for next session
                    sindhuSessionBuffer = "";

                    // Re-parse the full combined text
                    let finalParsed = null;
                    if (key) {
                        try {
                            appendMessage("Processing transaction...", "sindhu");
                            finalParsed = await callGeminiAI(textToParse, key);
                            // remove placeholder
                            const loadingMsg = messagesDiv.querySelector(".sindhu-msg.msg-sindhu:last-child");
                            if (loadingMsg && loadingMsg.innerText.includes("Processing")) {
                                loadingMsg.remove();
                            }
                        } catch (err) {
                            finalParsed = parseLocalCommand(textToParse);
                        }
                    } else {
                        finalParsed = parseLocalCommand(textToParse);
                    }

                    if (!finalParsed || finalParsed.action === "unknown") {
                        finalParsed = parseLocalCommand(textToParse);
                    }

                    if (finalParsed && finalParsed.action !== "unknown") {
                        finalParsed.originalText = textToParse;
                        await executeMutationAction(finalParsed, key);
                    } else {
                        const replyText = "जय हरी! मुझे एंट्री का ब्योरा समझ नहीं आया। प्लीज एक बार फिर ट्राई करें।";
                        appendMessage(replyText, "sindhu");
                        if (voiceReplyCheckbox && voiceReplyCheckbox.checked) {
                            speakSindhuText(replyText);
                        }
                    }
                }
            } else {
                // Non-mutation action (navigate, chat, unknown)
                // Execute immediately!
                if (parsed.action === 'navigate') {
                    parsed.originalText = inputText;
                    const actionResult = executeAgentAction(parsed);
                    let replyText = parsed.replyHindi || `जय हरी! मैंने ${parsed.target} स्क्रीन खोल दी है।`;
                    if (parsed.target === 'ledger-account' && typeof state !== 'undefined') {
                        let acc = state.accounts.find(a => a.id === parsed.value || a.name.toLowerCase().includes(String(parsed.value).toLowerCase()));
                        replyText = `जय हरी! मैंने ${acc ? acc.name : ''} का लेज़र खाता खोल दिया है।`;
                    } else if (parsed.target === 'client-report' && typeof state !== 'undefined') {
                        let client = state.clients.find(c => c.id === parsed.value || c.name.toLowerCase().includes(String(parsed.value).toLowerCase()));
                        replyText = `जय हरी! मैंने ${client ? client.name : ''} की डिटेल रिपोर्ट खोल दी है।`;
                    } else {
                        // Human friendly tab names mapping
                        const tabNames = {
                            'dashboard': 'डैशबोर्ड (Dashboard)',
                            'clients': 'क्लाइंट्स डायरेक्टरी (Clients & Income)',
                            'expenses': 'ट्रांजैक्शन एंट्रीज़ (Wealth Plus Entries)',
                            'reports': 'रिपोर्ट्स (Reports & Bookkeeping)',
                            'master': 'मास्टर सेटिंग्स (Master Settings)',
                            'reports-client': 'क्लाइंट रिपोर्ट्स (Client Reports)',
                            'reports-monthly': 'मंथली समरी (Monthly Summaries)',
                            'reports-ledger': 'अकाउंट्स लेजर (Accounts Ledger)',
                            'master-accounts': 'अकाउंट्स सेटअप (Accounts Setup)',
                            'master-clients-config': 'क्लाइंट्स सेटिंग्स (Clients Configuration)',
                            'master-categories': 'ट्रांजैक्शन हेड्स (Categories)',
                            'master-members': 'स्टाफ डायरेक्टरी (Members)'
                        };
                        if (tabNames[parsed.target]) {
                            replyText = `जय हरी! मैंने ${tabNames[parsed.target]} ओपन कर दिया है।`;
                        }
                    }
                    appendMessage(replyText, "sindhu");
                    if (voiceReplyCheckbox && voiceReplyCheckbox.checked) {
                        speakSindhuText(replyText);
                    }
                } else {
                    // General Chat / Question
                    let replyText = parsed.replyHindi || "जय हरी! बताइए मैं आपकी क्या सेवा कर सकती हूँ?";
                    appendMessage(replyText, "sindhu");
                    if (voiceReplyCheckbox && voiceReplyCheckbox.checked) {
                        speakSindhuText(replyText);
                    }
                }
            }
        }

        // Execute Mutation Action
        async function executeMutationAction(parsed, key) {
            let replyText = "";
            if (parsed.action === 'updateApp') {
                if (!key) {
                    replyText = "जय हरी! ऐप अपडेट करने के लिए मुझे जेमिनी एपीआई की (Gemini API Key) की आवश्यकता है, कृपया सेटिंग्स में जाकर इसे दर्ज करें।";
                } else {
                    try {
                        appendMessage(`Fetching current ${parsed.targetFile}...`, "sindhu");
                        const fileRes = await fetch(`${parsed.targetFile}?cb=${Date.now()}`);
                        if (!fileRes.ok) {
                            throw new Error(`Failed to fetch local file ${parsed.targetFile}`);
                        }
                        const currentCode = await fileRes.text();
                        
                        appendMessage(`Generating modifications for ${parsed.targetFile}...`, "sindhu");
                        const newCode = await generateModifiedCode(parsed.targetFile, currentCode, parsed.instructionForChange, key);
                        
                        appendMessage(`Writing modified code to ${parsed.targetFile} locally...`, "sindhu");
                        const writeRes = await fetch('/api/write-file', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                filename: parsed.targetFile,
                                content: newCode
                            })
                        });
                        
                        if (!writeRes.ok) {
                            const errData = await writeRes.json();
                            throw new Error(errData.error || `Failed to write file locally.`);
                        }
                        
                        appendMessage(`Deploying changes to GitHub repository...`, "sindhu");
                        if (typeof deployAppToGitHub === 'function') {
                            await deployAppToGitHub();
                            replyText = parsed.replyHindi || `जय हरी! मैंने ${parsed.targetFile} में आपके निर्देश अनुसार बदलाव कर दिए हैं और इसे गिटहब (Git) पर डिप्लॉय कर दिया है।`;
                        } else {
                            replyText = `जय हरी! मैंने ${parsed.targetFile} में बदलाव कर दिए हैं, लेकिन गिटहब डिप्लॉयमेंट फंक्शन नहीं मिला। कृपया इसे मैन्युअल रूप से पुश करें।`;
                        }
                    } catch (appErr) {
                        console.error("App update failed:", appErr);
                        replyText = `जय हरी! ऐप में अपडेशन करते समय एरर आया: ${appErr.message}`;
                    }
                }
            } else {
                const actionResult = executeAgentAction(parsed);
                if (actionResult.success) {
                    if (typeof renderPage === 'function' && typeof state !== 'undefined' && state.activePage) {
                        renderPage(state.activePage);
                    }
                    if (parsed.replyHindi) {
                        replyText = parsed.replyHindi;
                    } else {
                        if (parsed.action === 'addClient') {
                            replyText = `जय हरी! मैंने ${parsed.name} को ${parsed.monthlyPay > 0 ? `${parsed.monthlyPay} रुपये मंथली पेमेंट के साथ` : ''} न्यू क्लाइंट ऐड कर दिया है। कुछ और हेल्प चाहिए?`;
                        } else if (parsed.action === 'addExpense') {
                            replyText = `जय हरी! मैंने ₹${parsed.amount} का ${parsed.category} एक्सपेंस ${parsed.clientName ? `${parsed.clientName} के लिए` : ''} सेव कर लिया है। कोई और एंट्री करनी है?`;
                        } else if (parsed.action === 'addIncome') {
                            replyText = `जय हरी! ${parsed.clientName ? `${parsed.clientName} से` : ''} ₹${parsed.amount} रिसीव हो गए हैं और एंट्री सेव कर ली है। अगला काम बताएं?`;
                        }
                    }
                } else {
                    replyText = "जय हरी! बात तो समझ आ गई है, पर डेटाबेस में सेव करने में कोई प्रॉब्लम आ रही है। प्लीज एक बार फिर ट्राई कीजिए।";
                }
            }
            appendMessage(replyText, "sindhu");
            if (voiceReplyCheckbox && voiceReplyCheckbox.checked) {
                speakSindhuText(replyText);
            }
        }

        // Send text action
        if (sendBtn && chatInput) {
            sendBtn.addEventListener("click", () => {
                const text = chatInput.value.trim();
                if (text) processCommand(text);
            });
            chatInput.addEventListener("keypress", (e) => {
                if (e.key === "Enter") {
                    const text = chatInput.value.trim();
                    if (text) processCommand(text);
                }
            });
        }

        // Web Speech Recognition
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition && micBtn) {
            const recognition = new SpeechRecognition();
            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.lang = 'hi-IN'; // default to Hindi listening

            let isListening = false;
            let recognitionTimeout = null;
            let hasProcessedVoice = false;

            recognition.onstart = () => {
                isListening = true;
                hasProcessedVoice = false;
                micBtn.classList.add("active");
                chatInput.placeholder = "Listening... Speak now!";
                chatInput.value = "";
            };

            recognition.onend = () => {
                isListening = false;
                micBtn.classList.remove("active");
                chatInput.placeholder = "Type a command...";
                if (recognitionTimeout) {
                    clearTimeout(recognitionTimeout);
                    recognitionTimeout = null;
                }
                
                // Submit the voice text if not already processed
                if (!hasProcessedVoice) {
                    hasProcessedVoice = true;
                    const text = chatInput.value.trim();
                    if (text) {
                        processCommand(text);
                    }
                }
            };

            recognition.onerror = (e) => {
                console.error("Speech recognition error:", e);
                isListening = false;
                micBtn.classList.remove("active");
                chatInput.placeholder = "Type a command...";
                if (recognitionTimeout) {
                    clearTimeout(recognitionTimeout);
                    recognitionTimeout = null;
                }
            };

            recognition.onresult = (e) => {
                let transcript = "";
                for (let i = 0; i < e.results.length; i++) {
                    transcript += e.results[i][0].transcript;
                }
                chatInput.value = transcript;

                // Auto-submit after 1.8 seconds of silence
                if (recognitionTimeout) clearTimeout(recognitionTimeout);
                recognitionTimeout = setTimeout(() => {
                    if (isListening) {
                        recognition.stop();
                    }
                }, 1800);
            };

            micBtn.addEventListener("click", () => {
                if (isListening) {
                    recognition.stop();
                } else {
                    if (window.speechSynthesis) window.speechSynthesis.cancel();
                    recognition.start();
                }
            });
        } else if (micBtn) {
            micBtn.style.display = "none";
        }

        // Mouse and Touch dragging logic for the Sindhu widget
        function makeWidgetDraggable() {
            const widget = document.getElementById("sindhu-chat-widget");
            if (!widget || !toggleBtn) return;

            let isDragging = false;
            let startX = 0;
            let startY = 0;
            let initialX = 0;
            let initialY = 0;
            let dragThreshold = 6;
            let hasDragged = false;

            toggleBtn.addEventListener("mousedown", dragStart);
            toggleBtn.addEventListener("touchstart", dragStart, { passive: true });

            function dragStart(e) {
                hasDragged = false;
                
                let clientX = e.type === "touchstart" ? e.touches[0].clientX : e.clientX;
                let clientY = e.type === "touchstart" ? e.touches[0].clientY : e.clientY;

                startX = clientX;
                startY = clientY;

                const rect = widget.getBoundingClientRect();
                initialX = rect.left;
                initialY = rect.top;

                // Switch to absolute coordinates
                widget.style.bottom = "auto";
                widget.style.right = "auto";
                widget.style.left = `${initialX}px`;
                widget.style.top = `${initialY}px`;

                isDragging = true;

                document.addEventListener("mousemove", dragMove);
                document.addEventListener("touchmove", dragMove, { passive: false });
                document.addEventListener("mouseup", dragEnd);
                document.addEventListener("touchend", dragEnd);
            }

            function dragMove(e) {
                if (!isDragging) return;
                
                let clientX = e.type === "touchmove" ? e.touches[0].clientX : e.clientX;
                let clientY = e.type === "touchmove" ? e.touches[0].clientY : e.clientY;

                let dx = clientX - startX;
                let dy = clientY - startY;

                if (Math.abs(dx) > dragThreshold || Math.abs(dy) > dragThreshold) {
                    hasDragged = true;
                }

                let newX = initialX + dx;
                let newY = initialY + dy;

                const maxX = window.innerWidth - widget.offsetWidth;
                const maxY = window.innerHeight - widget.offsetHeight;

                newX = Math.max(0, Math.min(newX, maxX));
                newY = Math.max(0, Math.min(newY, maxY));

                widget.style.left = `${newX}px`;
                widget.style.top = `${newY}px`;

                // Adjust the alignment of the chat window dynamically
                if (chatWindow) {
                    const middleOfScreen = window.innerWidth / 2;
                    if (newX + widget.offsetWidth / 2 < middleOfScreen) {
                        // Left side of the screen - align chat window to left edge
                        chatWindow.style.left = "0";
                        chatWindow.style.right = "auto";
                        chatWindow.style.transformOrigin = "bottom left";
                    } else {
                        // Right side of the screen - align chat window to right edge
                        chatWindow.style.right = "0";
                        chatWindow.style.left = "auto";
                        chatWindow.style.transformOrigin = "bottom right";
                    }
                }

                if (e.type === "touchmove") {
                    e.preventDefault();
                }
            }

            function dragEnd() {
                isDragging = false;
                document.removeEventListener("mousemove", dragMove);
                document.removeEventListener("touchmove", dragMove);
                document.removeEventListener("mouseup", dragEnd);
                document.removeEventListener("touchend", dragEnd);
            }

            // Intercept click if drag occurred
            toggleBtn.addEventListener("click", (e) => {
                if (hasDragged) {
                    e.preventDefault();
                    e.stopPropagation();
                }
            }, true);
        }

        makeWidgetDraggable();

        // Initial visibility check when DOM is ready
        updateSindhuVisibility();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initSindhuWidget);
    } else {
        setTimeout(initSindhuWidget, 0);
    }

    // Make sure voices are loaded
    if (window.speechSynthesis && window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = () => {
            // trigger loading of voices
            window.speechSynthesis.getVoices();
        };
    }
})();
