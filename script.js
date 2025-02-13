/***********************
 * Data & Initialization
 ***********************/
const categories = [{
        name: "General",
        channels: [{
                id: "text1",
                name: "General Chat",
                type: "text"
            }
        ]
    }, {
        name: "Learning",
        channels: [{
                id: "flashcard1",
                name: "Flashcards",
                type: "flashcard"
            }, {
                id: "whiteboard1",
                name: "Whiteboard",
                type: "whiteboard"
            }, {
                id: "code1",
                name: "Code Runner",
                type: "code"
            }
        ]
    }, {
        name: "Reminders",
        channels: [{
                id: "reminder1",
                name: "My Reminders",
                type: "reminder"
            }
        ]
    }
];

// In‑memory demo storage:
const chatMessages = {}; // Each message will be an object: { date, text, files }
const flashcards = {}; // Stored as objects: { question, answers: [ { text, correct } ] }
const reminders = {}; // For reminders; each channel id key maps to an array of reminders
if (!window.whiteboardData)
    window.whiteboardData = {};
if (!window.codeData)
    window.codeData = {};

/***********************
 * Sidebar & Channel Selection
 ***********************/
function renderSidebar() {
    const sidebar = document.querySelector(".sidebar");
    sidebar.innerHTML = "";
    const collapseBtn = document.createElement("button");
    collapseBtn.textContent = "▶";
    collapseBtn.classList.add("collapse-btn");
    collapseBtn.addEventListener("click", () => sidebar.classList.toggle("collapsed"));
    sidebar.appendChild(collapseBtn);
    categories.forEach(category => {
        const catTitle = document.createElement("h2");
        catTitle.textContent = category.name;
        sidebar.appendChild(catTitle);
        const ul = document.createElement("ul");
        ul.classList.add("channel-list");
        category.channels.forEach(channel => {
            const li = document.createElement("li");
            li.textContent = channel.name;
            li.classList.add("channel-item");
            li.dataset.channelId = channel.id;
            li.dataset.channelType = channel.type;
            li.addEventListener("click", () => selectChannel(channel));
            ul.appendChild(li);
        });
        sidebar.appendChild(ul);
    });
	if (!window.sidebarOutsideListenerAdded) {
        const collapseSidebar = (event) => {
            // If the click/touch is not inside the sidebar element, collapse it.
            if (sidebar && !sidebar.contains(event.target)) {
                sidebar.classList.add("collapsed");
            }
        };
        document.addEventListener("click", collapseSidebar);
        document.addEventListener("touchstart", collapseSidebar);
        window.sidebarOutsideListenerAdded = true;
    }
}

function selectChannel(channel) {
    document.querySelectorAll(".channel-item").forEach(item => {
        item.classList.remove("active-channel");
        if (item.dataset.channelId === channel.id) {
            item.classList.add("active-channel");
        }
    });
	document.querySelector(".sidebar").classList.add("collapsed");
    renderChannel(channel);
}

function renderChannel(channel) {
    const main = document.querySelector(".main-content");
    main.innerHTML = "";
    if (channel.type === "text") {
        renderTextChannel(main, channel);
    } else if (channel.type === "flashcard") {
        renderFlashcardChannel(main, channel);
    } else if (channel.type === "whiteboard") {
        renderWhiteboardChannel(main, channel);
    } else if (channel.type === "code") {
        renderCodeChannel(main, channel);
    } else if (channel.type === "reminder") {
        renderReminderChannel(main, channel);
    }
}

/***********************
 * 1. General Chat (Text Channel with Attachments and Editable Messages)
 ***********************/
function renderTextChannel(container, channel) {
    container.innerHTML = "";
    const chatContainer = document.createElement("div");
    chatContainer.classList.add("chat-container");
    chatContainer.style.height = "100%";

    const messagesDiv = document.createElement("div");
    messagesDiv.classList.add("messages-area");
    chatContainer.appendChild(messagesDiv);

    function updateMessages() {
        messagesDiv.innerHTML = "";
        (chatMessages[channel.id] || []).forEach((msg, index) => {
            if (typeof msg === "string") {
                msg = {
                    date: new Date().toLocaleString(),
                    text: msg,
                    files: []
                };
                chatMessages[channel.id][index] = msg;
            }
            const msgContainer = document.createElement("div");
            msgContainer.classList.add("message-container");

            const dateDiv = document.createElement("div");
            dateDiv.classList.add("message-date");
            dateDiv.textContent = msg.date;
            msgContainer.appendChild(dateDiv);

            const contentDiv = document.createElement("div");
            contentDiv.classList.add("message-content");
            const textContainer = document.createElement("span");

            const text = msg.text;
            const urlRegex = /(https?:\/\/\S+|www\.\S+)/gi;
            const parts = text.split(urlRegex);

            parts.forEach((part, i) => {
                if (!part) return;
                if (i % 2 === 1) {
                    let url = part;
                    if (/^www\./i.test(url)) {
                        url = 'http://' + url;
                    }
                    try {
                        new URL(url);
                        const link = document.createElement('a');
                        link.href = url;
                        link.textContent = part;
                        link.target = '_blank';
                        link.rel = 'noopener noreferrer';
                        textContainer.appendChild(link);
                    } catch (e) {
                        textContainer.appendChild(document.createTextNode(part));
                    }
                } else {
                    textContainer.appendChild(document.createTextNode(part));
                }
            });
            contentDiv.appendChild(textContainer);

            if (msg.files && msg.files.length > 0) {
                const filesDiv = document.createElement("div");
                msg.files.forEach(file => {
                    const fileWrapper = document.createElement("div");
                    fileWrapper.style.border = "1px solid #ccc";
                    fileWrapper.style.padding = "5px";
                    fileWrapper.style.marginTop = "5px";
                    if (file.type.startsWith("image/")) {
                        const img = document.createElement("img");
                        img.src = file.content;
                        img.style.maxWidth = "200px";
                        fileWrapper.appendChild(img);
                    } else if (file.type.startsWith("audio/")) {
                        const audio = document.createElement("audio");
                        audio.controls = true;
                        audio.src = file.content;
                        fileWrapper.appendChild(audio);
                    } else if (file.type.startsWith("text/") || file.type === "") {
                        const pre = document.createElement("pre");
                        pre.textContent = file.content;
                        pre.style.maxHeight = "150px";
                        pre.style.overflow = "auto";
                        fileWrapper.appendChild(pre);
                    } else {
                        fileWrapper.textContent = file.name;
                    }
                    const downloadBtn = document.createElement("button");
                    downloadBtn.textContent = "Download";
                    downloadBtn.addEventListener("click", () => {
                        const a = document.createElement("a");
                        if (file.type.startsWith("image/") || file.type.startsWith("audio/")) {
                            a.href = file.content;
                        } else {
                            const blob = new Blob([file.content], {
                                type: file.type || "text/plain"
                            });
                            a.href = URL.createObjectURL(blob);
                        }
                        a.download = file.name;
                        a.click();
                    });
                    fileWrapper.appendChild(downloadBtn);
                    filesDiv.appendChild(fileWrapper);
                });
                contentDiv.appendChild(filesDiv);
            }
            msgContainer.appendChild(contentDiv);

            const btnContainer = document.createElement("div");
            btnContainer.classList.add("message-buttons");
            const editBtn = document.createElement("button");
            editBtn.textContent = "Edit";
            const removeBtn = document.createElement("button");
            removeBtn.textContent = "Remove";
            btnContainer.appendChild(editBtn);
            btnContainer.appendChild(removeBtn);
            msgContainer.appendChild(btnContainer);

            editBtn.addEventListener("click", () => {
                const editForm = document.createElement("form");
                const editInput = document.createElement("input");
                editInput.type = "text";
                editInput.value = msg.text;
                editForm.appendChild(editInput);
                const editFilesDiv = document.createElement("div");
                msg.files.forEach((file, fileIndex) => {
                    const fileRow = document.createElement("div");
                    fileRow.textContent = file.name;
                    const removeFileBtn = document.createElement("button");
                    removeFileBtn.type = "button";
                    removeFileBtn.textContent = "Remove";
                    removeFileBtn.addEventListener("click", () => {
                        msg.files.splice(fileIndex, 1);
                        updateMessages();
                    });
                    fileRow.appendChild(removeFileBtn);
                    editFilesDiv.appendChild(fileRow);
                });
                editForm.appendChild(editFilesDiv);
                const newAttachBtn = document.createElement("button");
                newAttachBtn.type = "button";
                newAttachBtn.textContent = "Attach File";
                editForm.appendChild(newAttachBtn);
                const newFileInput = document.createElement("input");
                newFileInput.type = "file";
                newFileInput.style.display = "none";
                newFileInput.multiple = true;
                editForm.appendChild(newFileInput);
                newAttachBtn.addEventListener("click", () => newFileInput.click());
                newFileInput.addEventListener("change", () => {
                    for (const file of newFileInput.files) {
                        if (file.type.startsWith("image/") || file.type.startsWith("audio/")) {
                            const reader = new FileReader();
                            reader.onload = (e) => {
                                msg.files.push({
                                    name: file.name,
                                    type: file.type,
                                    content: e.target.result
                                });
                                updateMessages();
                            };
                            reader.readAsDataURL(file);
                        } else {
                            const reader = new FileReader();
                            reader.onload = (e) => {
                                msg.files.push({
                                    name: file.name,
                                    type: file.type,
                                    content: e.target.result
                                });
                                updateMessages();
                            };
                            reader.readAsText(file);
                        }
                    }
                    newFileInput.value = "";
                });
                const saveBtn = document.createElement("button");
                saveBtn.type = "submit";
                saveBtn.textContent = "Save";
                const cancelBtn = document.createElement("button");
                cancelBtn.type = "button";
                cancelBtn.textContent = "Cancel";
                editForm.appendChild(saveBtn);
                editForm.appendChild(cancelBtn);
                msgContainer.innerHTML = "";
                msgContainer.appendChild(editForm);
                editForm.addEventListener("submit", (e) => {
                    e.preventDefault();
                    msg.text = editInput.value;
                    updateMessages();
                });
                cancelBtn.addEventListener("click", () => {
                    updateMessages();
                });
            });

            removeBtn.addEventListener("click", () => {
                chatMessages[channel.id].splice(index, 1);
                updateMessages();
            });

            messagesDiv.appendChild(msgContainer);
        });
    }

    if (!chatMessages[channel.id]) {
        chatMessages[channel.id] = [];
    }
    updateMessages();

    const footerDiv = document.createElement("div");
    footerDiv.classList.add("chat-footer");
    const textInput = document.createElement("input");
    textInput.type = "text";
    textInput.placeholder = "Type a message...";
    footerDiv.appendChild(textInput);
    const attachBtn = document.createElement("button");
    attachBtn.textContent = "Attach File";
    attachBtn.type = "button";
    footerDiv.appendChild(attachBtn);
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.style.display = "none";
    fileInput.multiple = true;
    footerDiv.appendChild(fileInput);
    const sendBtn = document.createElement("button");
    sendBtn.textContent = "Send";
    sendBtn.type = "submit";
    footerDiv.appendChild(sendBtn);
    const fileListDiv = document.createElement("div");
    footerDiv.appendChild(fileListDiv);

    let attachedFiles = [];
    function updateFileList() {
        fileListDiv.innerHTML = "";
        attachedFiles.forEach((file, index) => {
            const fileDiv = document.createElement("div");
            fileDiv.textContent = file.name;
            const removeBtn = document.createElement("button");
            removeBtn.textContent = "Remove";
            removeBtn.type = "button";
            removeBtn.style.marginLeft = "10px";
            removeBtn.addEventListener("click", () => {
                attachedFiles.splice(index, 1);
                updateFileList();
            });
            fileDiv.appendChild(removeBtn);
            fileListDiv.appendChild(fileDiv);
        });
    }
    attachBtn.addEventListener("click", () => fileInput.click());
    fileInput.addEventListener("change", () => {
        for (const file of fileInput.files) {
            if (file.type.startsWith("image/") || file.type.startsWith("audio/")) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    attachedFiles.push({
                        name: file.name,
                        type: file.type,
                        content: e.target.result
                    });
                    updateFileList();
                };
                reader.readAsDataURL(file);
            } else {
                const reader = new FileReader();
                reader.onload = (e) => {
                    attachedFiles.push({
                        name: file.name,
                        type: file.type,
                        content: e.target.result
                    });
                    updateFileList();
                };
                reader.readAsText(file);
            }
        }
        fileInput.value = "";
    });
    const form = document.createElement("form");
    form.addEventListener("submit", (e) => {
        e.preventDefault();
        const text = textInput.value;
        let messageObj;
        if (attachedFiles.length > 0) {
            messageObj = {
                date: new Date().toLocaleString(),
                text,
                files: attachedFiles
            };
        } else {
            messageObj = {
                date: new Date().toLocaleString(),
                text,
                files: []
            };
        }
        if ((typeof text === "string" && text.trim() !== "") || attachedFiles.length > 0) {
            chatMessages[channel.id].push(messageObj);
            updateMessages();
            textInput.value = "";
            attachedFiles = [];
            updateFileList();
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
        }
    });
    form.appendChild(footerDiv);
    chatContainer.appendChild(form);
    container.appendChild(chatContainer);
}

/***********************
 * 2. Flashcard Maker & Tester (Multiple answers, test mode shows score and highlights answers)
 ***********************/
function renderFlashcardChannel(container, channel) {
    const header = document.createElement("h2");
    header.textContent = "Flashcard Maker & Tester";
    container.appendChild(header);

    const modeContainer = document.createElement("div");

    // Creation mode container.
    const creationDiv = document.createElement("div");

    // Form for adding flashcards.
    const form = document.createElement("form");
    form.classList.add("flashcard-form");

    const questionInput = document.createElement("input");
    questionInput.type = "text";
    questionInput.placeholder = "Enter question here";
    questionInput.required = true;
    questionInput.style.width = "100%";
    form.appendChild(questionInput);

    const answersContainer = document.createElement("div");
    answersContainer.id = "answers-container";
    form.appendChild(answersContainer);

    function addAnswerRow(defaultText = "", defaultCorrect = false) {
        const row = document.createElement("div");
        row.classList.add("answer-row");
        const answerInput = document.createElement("input");
        answerInput.type = "text";
        answerInput.placeholder = "Answer";
        answerInput.required = true;
        answerInput.value = defaultText;
        row.appendChild(answerInput);
        const correctToggle = document.createElement("input");
        correctToggle.type = "checkbox";
        correctToggle.title = "Mark as correct answer";
        correctToggle.checked = defaultCorrect;
        row.appendChild(correctToggle);
        const removeBtn = document.createElement("button");
        removeBtn.type = "button";
        removeBtn.textContent = "Remove";
        removeBtn.addEventListener("click", () => {
            answersContainer.removeChild(row);
        });
        row.appendChild(removeBtn);
        answersContainer.appendChild(row);
    }
    addAnswerRow();

    const addAnswerBtn = document.createElement("button");
    addAnswerBtn.type = "button";
    addAnswerBtn.textContent = "Add Answer";
    addAnswerBtn.addEventListener("click", () => {
        addAnswerRow();
    });
    form.appendChild(addAnswerBtn);

    const addFlashcardBtn = document.createElement("button");
    addFlashcardBtn.type = "submit";
    addFlashcardBtn.textContent = "Add Flashcard";
    form.appendChild(addFlashcardBtn);

    creationDiv.appendChild(form);

    const startTestBtn = document.createElement("button");
    startTestBtn.type = "button";
    startTestBtn.textContent = "Start Test";
    creationDiv.appendChild(startTestBtn);

    const flashcardListDiv = document.createElement("div");
    creationDiv.appendChild(flashcardListDiv);

    // Test mode container (hidden initially)
    const testDiv = document.createElement("div");
    testDiv.style.display = "none";
    modeContainer.appendChild(creationDiv);
    modeContainer.appendChild(testDiv);
    container.appendChild(modeContainer);

    function renderFlashcardsList() {
        flashcardListDiv.innerHTML = "";
        flashcards[channel.id] = flashcards[channel.id] || [];
        flashcards[channel.id].forEach((card, index) => {
            const cardDiv = document.createElement("div");
            cardDiv.classList.add("flashcard");

            const questionP = document.createElement("p");
            questionP.textContent = "Q: " + card.question;
            cardDiv.appendChild(questionP);

            const answersList = document.createElement("ul");
            card.answers.forEach(ans => {
                const li = document.createElement("li");
                li.textContent = ans.text + (ans.correct ? " (Correct)" : "");
                answersList.appendChild(li);
            });
            cardDiv.appendChild(answersList);

            const btnContainer = document.createElement("div");
            btnContainer.classList.add("flashcard-buttons");

            const editBtn = document.createElement("button");
            editBtn.textContent = "Edit";
            editBtn.type = "button";
            btnContainer.appendChild(editBtn);

            const removeBtn = document.createElement("button");
            removeBtn.textContent = "Remove";
            removeBtn.type = "button";
            btnContainer.appendChild(removeBtn);

            cardDiv.appendChild(btnContainer);

            editBtn.addEventListener("click", () => {
                if (editBtn.textContent === "Edit") {
                    const questionInputEdit = document.createElement("input");
                    questionInputEdit.type = "text";
                    questionInputEdit.value = card.question;
                    cardDiv.replaceChild(questionInputEdit, questionP);

                    const answersEditDiv = document.createElement("div");
                    card.answers.forEach(ans => {
                        const row = document.createElement("div");
                        row.classList.add("answer-row");
                        const answerInputEdit = document.createElement("input");
                        answerInputEdit.type = "text";
                        answerInputEdit.value = ans.text;
                        row.appendChild(answerInputEdit);
                        const correctToggleEdit = document.createElement("input");
                        correctToggleEdit.type = "checkbox";
                        correctToggleEdit.checked = ans.correct;
                        row.appendChild(correctToggleEdit);
                        answersEditDiv.appendChild(row);
                    });
                    const addNewAnswerBtn = document.createElement("button");
                    addNewAnswerBtn.type = "button";
                    addNewAnswerBtn.textContent = "Add Answer";
                    addNewAnswerBtn.addEventListener("click", () => {
                        const row = document.createElement("div");
                        row.classList.add("answer-row");
                        const answerInputEdit = document.createElement("input");
                        answerInputEdit.type = "text";
                        answerInputEdit.placeholder = "New answer";
                        row.appendChild(answerInputEdit);
                        const correctToggleEdit = document.createElement("input");
                        correctToggleEdit.type = "checkbox";
                        row.appendChild(correctToggleEdit);
                        answersEditDiv.appendChild(row);
                    });
                    answersEditDiv.appendChild(addNewAnswerBtn);
                    cardDiv.replaceChild(answersEditDiv, answersList);
                    editBtn.textContent = "Save";
                } else {
                    const questionInputEdit = cardDiv.querySelector('input[type="text"]');
                    card.question = questionInputEdit.value;
                    const newAnswers = [];
                    const rows = cardDiv.querySelectorAll(".answer-row");
                    rows.forEach(row => {
                        const textInput = row.querySelector('input[type="text"]');
                        const toggle = row.querySelector('input[type="checkbox"]');
                        if (textInput && textInput.value.trim() !== "") {
                            newAnswers.push({
                                text: textInput.value,
                                correct: toggle.checked
                            });
                        }
                    });
                    card.answers = newAnswers;
                    renderFlashcardsList();
                }
            });

            removeBtn.addEventListener("click", () => {
                flashcards[channel.id].splice(index, 1);
                renderFlashcardsList();
            });

            flashcardListDiv.appendChild(cardDiv);
        });

        // Update Start Test button state
        startTestBtn.disabled = !flashcards[channel.id] || flashcards[channel.id].length === 0;
    }

    // Initial render of flashcards list
    renderFlashcardsList();

    form.addEventListener("submit", (e) => {
        e.preventDefault();
        const question = questionInput.value.trim();
        if (!question)
            return;
        const answerRows = answersContainer.querySelectorAll(".answer-row");
        const answersArr = [];
        answerRows.forEach(row => {
            const textInput = row.querySelector('input[type="text"]');
            const toggle = row.querySelector('input[type="checkbox"]');
            if (textInput && textInput.value.trim() !== "") {
                answersArr.push({
                    text: textInput.value,
                    correct: toggle.checked
                });
            }
        });
        if (answersArr.length === 0)
            return;
        flashcards[channel.id] = flashcards[channel.id] || [];
        flashcards[channel.id].push({
            question,
            answers: answersArr
        });
        questionInput.value = "";
        answersContainer.innerHTML = "";
        addAnswerRow();
        renderFlashcardsList();
    });

    startTestBtn.addEventListener("click", () => {
        creationDiv.style.display = "none";
        renderTestMode(testDiv, channel);
        testDiv.style.display = "block";
    });

    function renderTestMode(testContainer, channel) {
        testContainer.innerHTML = "";
        const flashcardsArr = [...(flashcards[channel.id] || [])].sort(() => Math.random() - 0.5);
        if (flashcardsArr.length === 0) {
            testContainer.textContent = "No flashcards available for testing.";
            return;
        }
        const formTest = document.createElement("form");

        flashcardsArr.forEach((card, idx) => {
            const questionDiv = document.createElement("div");
            questionDiv.style.marginBottom = "10px";

            const questionP = document.createElement("p");
            questionP.textContent = "Q: " + card.question;
            questionDiv.appendChild(questionP);

            card.answers.forEach((ans, aIdx) => {
                const label = document.createElement("label");
                label.style.display = "block";

                const checkbox = document.createElement("input");
                checkbox.type = "checkbox";
                checkbox.name = `card${idx}`;
                checkbox.value = aIdx;

                label.appendChild(checkbox);
                label.appendChild(document.createTextNode(" " + ans.text));
                questionDiv.appendChild(label);
            });

            formTest.appendChild(questionDiv);
        });

        const submitTestBtn = document.createElement("button");
        submitTestBtn.type = "submit";
        submitTestBtn.textContent = "Submit Answers";
        formTest.appendChild(submitTestBtn);

        const backBtn = document.createElement("button");
        backBtn.type = "button";
        backBtn.textContent = "Back";
        backBtn.addEventListener("click", () => {
            testContainer.style.display = "none";
            creationDiv.style.display = "block";
        });
        formTest.appendChild(backBtn);

        const resultDiv = document.createElement("div");
        resultDiv.style.marginTop = "10px";
        formTest.appendChild(resultDiv);

        formTest.addEventListener("submit", (e) => {
            e.preventDefault();
            let score = 0;

            flashcardsArr.forEach((card, idx) => {
                const selected = Array.from(formTest.querySelectorAll(`input[name="card${idx}"]:checked`))
                    .map(input => parseInt(input.value));

                const correctIndices = card.answers
                    .map((ans, aIdx) => (ans.correct ? aIdx : null))
                    .filter(aIdx => aIdx !== null);

                if (selected.sort().toString() === correctIndices.sort().toString()) {
                    score++;
                }

                // Apply correct/incorrect styles and disable checkboxes
                const labels = formTest.querySelectorAll(`input[name="card${idx}"]`);
                labels.forEach(input => {
                    const value = parseInt(input.value);
                    if (correctIndices.includes(value)) {
                        input.parentElement.classList.add("correct-highlight");
                    }
                    if (!correctIndices.includes(value) && input.checked) {
                        input.parentElement.classList.add("incorrect-highlight");
                    }
                    input.disabled = true;
                });
            });

            resultDiv.textContent = `Your score: ${score} / ${flashcardsArr.length}`;
        });

        testContainer.appendChild(formTest);
    }
}

/***********************
 * 3. Whiteboard (Full-screen canvas with relative brush size and brush indicator)
 ***********************/
function renderWhiteboardChannel(container, channel) {
    const header = document.createElement("h2");
    header.textContent = "Whiteboard";
    container.appendChild(header);

    // Create toolbar
    const toolbar = document.createElement("div");
    toolbar.style.display = "flex";
    toolbar.style.alignItems = "center";
    toolbar.style.gap = "10px";
    toolbar.style.padding = "5px";
    toolbar.style.backgroundColor = "#f0f0f0";
    container.appendChild(toolbar);

    // Color picker
    const colorLabel = document.createElement("label");
    colorLabel.textContent = "Color:";
    const colorPicker = document.createElement("input");
    colorPicker.type = "color";
    colorPicker.value = "#000000";
    colorPicker.style.cursor = "pointer";
    toolbar.appendChild(colorLabel);
    toolbar.appendChild(colorPicker);

    // Size control
    const sizeLabel = document.createElement("label");
    sizeLabel.textContent = "Size:";
    toolbar.appendChild(sizeLabel);
    const sizeSlider = document.createElement("input");
    sizeSlider.type = "range";
    sizeSlider.min = "1";
    sizeSlider.max = "50";
    sizeSlider.value = "2";
    sizeSlider.style.width = "100px";
    toolbar.appendChild(sizeSlider);
    const sizeValue = document.createElement("span");
    sizeValue.textContent = sizeSlider.value;
    toolbar.appendChild(sizeValue);

    // Eraser button
    const eraserButton = document.createElement("button");
    eraserButton.textContent = "Eraser";
    eraserButton.style.marginLeft = "10px";
    toolbar.appendChild(eraserButton);

    // Clear button
    const clearButton = document.createElement("button");
    clearButton.textContent = "Clear Canvas";
    clearButton.style.marginLeft = "auto";
    clearButton.style.padding = "5px 10px";
    clearButton.style.cursor = "pointer";
    toolbar.appendChild(clearButton);

    // Whiteboard container
    const whiteboardWrapper = document.createElement("div");
    whiteboardWrapper.classList.add("whiteboard-wrapper");
    whiteboardWrapper.style.height = "calc(100% - 70px)";
    whiteboardWrapper.style.position = "relative";
    container.appendChild(whiteboardWrapper);

    // Canvas setup
    const canvas = document.createElement("canvas");
    canvas.style.position = "absolute";
    canvas.style.top = "0";
    canvas.style.left = "0";
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    whiteboardWrapper.appendChild(canvas);

    // Cursor element
    const cursor = document.createElement("div");
    cursor.style.position = "absolute";
    cursor.style.pointerEvents = "none";
    cursor.style.border = "2px solid #000";
    cursor.style.borderRadius = "50%";
    cursor.style.transform = "translate(-50%, -50%)";
    cursor.style.display = "none";
    cursor.style.zIndex = "9999";
    whiteboardWrapper.appendChild(cursor);

    const ctx = canvas.getContext("2d");

    // State variables
    let drawings = window.whiteboardData[channel.id] || [];
    let currentColor = "#000000";
    let currentSize = 2;
    let isEraserActive = false;
    let cursorX, cursorY, prevCursorX, prevCursorY;
    let offsetX = 0, offsetY = 0;
    let scale = 1;
    let leftMouseDown = false, rightMouseDown = false;

    // Update cursor visual properties
    function updateCursor() {
        if (isEraserActive) {
            cursor.style.borderColor = "#ff0000";
            const size = currentSize * 2;
            cursor.style.width = `${size}px`;
            cursor.style.height = `${size}px`;
        } else {
            cursor.style.borderColor = currentColor;
            cursor.style.width = `${currentSize}px`;
            cursor.style.height = `${currentSize}px`;
        }
    }

    function resizeCanvas() {
        canvas.width = whiteboardWrapper.clientWidth;
        canvas.height = whiteboardWrapper.clientHeight;
        redrawCanvas();
    }

    function toScreenX(xTrue) {
        return (xTrue + offsetX) * scale;
    }

    function toScreenY(yTrue) {
        return (yTrue + offsetY) * scale;
    }

    function toTrueX(xScreen) {
        return (xScreen / scale) - offsetX;
    }

    function toTrueY(yScreen) {
        return (yScreen / scale) - offsetY;
    }

    function trueWidth() {
        return canvas.clientWidth / scale;
    }

    function trueHeight() {
        return canvas.clientHeight / scale;
    }

    function redrawCanvas() {
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        for (const line of drawings) {
            drawLine(
                toScreenX(line.x0),
                toScreenY(line.y0),
                toScreenX(line.x1),
                toScreenY(line.y1),
                line.color,
                line.size
            );
        }
    }

    function drawLine(x0, y0, x1, y1, color, size) {
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
        ctx.strokeStyle = color;
        ctx.lineWidth = size;
        ctx.lineCap = "round";
        ctx.stroke();
    }

    function onMouseDown(event) {
        const rect = canvas.getBoundingClientRect();
        cursorX = event.clientX - rect.left;
        cursorY = event.clientY - rect.top;
        if (event.button === 0) {
            leftMouseDown = true;
            rightMouseDown = false;
        }
        if (event.button === 2) {
            rightMouseDown = true;
            leftMouseDown = false;
        }
        prevCursorX = cursorX;
        prevCursorY = cursorY;
    }

    function onMouseMove(event) {
        const rect = canvas.getBoundingClientRect();
        cursorX = event.clientX - rect.left;
        cursorY = event.clientY - rect.top;

        cursor.style.display = "block";
        cursor.style.left = `${cursorX}px`;
        cursor.style.top = `${cursorY}px`;

        const scaledX = toTrueX(cursorX);
        const scaledY = toTrueY(cursorY);
        const prevScaledX = toTrueX(prevCursorX);
        const prevScaledY = toTrueY(prevCursorY);

        if (leftMouseDown) {
            if (isEraserActive) {
                const eraserSize = currentSize / scale;
                const p = { x: scaledX, y: scaledY };
                for (let i = drawings.length - 1; i >= 0; i--) {
                    const segment = drawings[i];
                    const a = { x: segment.x0, y: segment.y0 };
                    const b = { x: segment.x1, y: segment.y1 };
                    const distance = distancePointToSegment(p, a, b);
                    if (distance < eraserSize) {
                        drawings.splice(i, 1);
                    }
                }
                redrawCanvas();
            } else {
                drawings.push({
                    x0: prevScaledX,
                    y0: prevScaledY,
                    x1: scaledX,
                    y1: scaledY,
                    color: currentColor,
                    size: currentSize
                });
                drawLine(prevCursorX, prevCursorY, cursorX, cursorY, currentColor, currentSize);
            }
        }

        if (rightMouseDown) {
            cursor.style.display = "none";
            offsetX += (cursorX - prevCursorX) / scale;
            offsetY += (cursorY - prevCursorY) / scale;
            redrawCanvas();
        }

        prevCursorX = cursorX;
        prevCursorY = cursorY;
    }

    function onMouseUp() {
        leftMouseDown = false;
        rightMouseDown = false;
    }

    function onMouseWheel(event) {
        const deltaY = event.deltaY;
        const scaleAmount = -deltaY / 500;
        scale = scale * (1 + scaleAmount);
        const rect = canvas.getBoundingClientRect();
        const distX = (event.clientX - rect.left) / canvas.clientWidth;
        const distY = (event.clientY - rect.top) / canvas.clientHeight;
        const unitsZoomedX = trueWidth() * scaleAmount;
        const unitsZoomedY = trueHeight() * scaleAmount;
        offsetX -= unitsZoomedX * distX;
        offsetY -= unitsZoomedY * distY;
        redrawCanvas();
    }

    function saveDrawings() {
        window.whiteboardData[channel.id] = drawings;
    }

    // Event listeners
    canvas.addEventListener("mousedown", onMouseDown);
    canvas.addEventListener("mouseup", onMouseUp);
    canvas.addEventListener("mouseout", onMouseUp);
    canvas.addEventListener("mousemove", onMouseMove);
    canvas.addEventListener("wheel", onMouseWheel);
    canvas.addEventListener("mouseleave", () => {
        cursor.style.display = "none";
    });

    document.oncontextmenu = () => false;

    // Tool controls
    colorPicker.addEventListener("input", (e) => {
        currentColor = e.target.value;
        updateCursor();
    });

    sizeSlider.addEventListener("input", (e) => {
        currentSize = parseInt(e.target.value);
        sizeValue.textContent = currentSize;
        updateCursor();
    });

    eraserButton.addEventListener("click", () => {
        isEraserActive = !isEraserActive;
        eraserButton.style.backgroundColor = isEraserActive ? "#cccccc" : "";
        updateCursor();
    });

    clearButton.addEventListener("click", () => {
        drawings = [];
        redrawCanvas();
        saveDrawings();
    });

    // Initial setup
    updateCursor();
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    // Save drawings before leaving the channel
    container.addEventListener("unload", saveDrawings);
}
/***********************
 * 4. Code Runner (Full code editor, non-resizable)
 ***********************/
function renderCodeChannel(container, channel) {
    const header = document.createElement("h2");
    header.textContent = "Code Runner";
    container.appendChild(header);

    const wrapper = document.createElement("div");
    wrapper.classList.add("code-runner-wrapper");
    wrapper.style.height = "calc(100% - 40px)";
    wrapper.style.position = "relative";
    container.appendChild(wrapper);

    const runBtn = document.createElement("button");
    runBtn.textContent = "Run Code";
    runBtn.classList.add("run-btn");
    wrapper.appendChild(runBtn);

    const codeArea = document.createElement("textarea");
    codeArea.classList.add("code-runner-textarea");
    codeArea.style.boxSizing = "border-box";
    codeArea.style.resize = "none";
    wrapper.appendChild(codeArea);
    if (window.codeData[channel.id]) {
        codeArea.value = window.codeData[channel.id];
    }
    codeArea.addEventListener("input", () => {
        window.codeData[channel.id] = codeArea.value;
    });

    const outputDiv = document.createElement("div");
    outputDiv.classList.add("code-runner-output");
    wrapper.appendChild(outputDiv);

    runBtn.addEventListener("click", () => {
        const code = codeArea.value;
        const logs = [];
        const originalConsoleLog = console.log;
        console.log = function (...args) {
            logs.push(args.join(" "));
            originalConsoleLog.apply(console, args);
        };
        try {
            const result = eval(code);
            let outputText = logs.length > 0 ? logs.join("\n") : (result !== undefined ? result : "Code executed successfully.");
            outputDiv.textContent = outputText;
        } catch (error) {
            outputDiv.textContent = "Error: " + error;
        }
        console.log = originalConsoleLog;
    });
}

/***********************
 * 5. Reminders Channel
 ***********************/
function renderReminderChannel(container, channel) {
    const header = document.createElement("h2");
    header.textContent = "Reminders";
    container.appendChild(header);

    // Contrast calculation function
    function getContrastingTextColor(bgColor) {
        const parseColor = (colorStr) => {
            colorStr = colorStr.trim().toLowerCase();
            if (colorStr.startsWith('#')) {
                let hex = colorStr.slice(1);
                if ([3, 4].includes(hex.length)) {
                    hex = hex.split('').map(c => c + c).join('');
                }
                return {
                    r: parseInt(hex.substring(0, 2), 16),
                    g: parseInt(hex.substring(2, 4), 16),
                    b: parseInt(hex.substring(4, 6), 16)
                };
            }
            if (colorStr.startsWith('rgb')) {
                const parts = colorStr.match(/(\d+)/g) || [];
                return {
                    r: parseInt(parts[0]) || 0,
                    g: parseInt(parts[1]) || 0,
                    b: parseInt(parts[2]) || 0
                };
            }
            return { r: 255, g: 255, b: 255 };
        };

        const calculateLuminance = (r, g, b) => {
            const srgbToLinear = (c) => {
                c /= 255;
                return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
            };
            return 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b);
        };

        const { r, g, b } = parseColor(bgColor);
        return calculateLuminance(r, g, b) > 0.179 ? '#000000' : '#ffffff';
    }

    // Ensure reminders storage exists
    if (!reminders[channel.id]) {
        reminders[channel.id] = [];
    }

    // List of reminders
    const listDiv = document.createElement("div");
    container.appendChild(listDiv);

    function renderReminders() {
        listDiv.innerHTML = "";
        reminders[channel.id].forEach((reminder, index) => {
            const reminderDiv = document.createElement("div");
            reminderDiv.classList.add("reminder-container");
            
            // Set background and calculated text color
            reminderDiv.style.backgroundColor = reminder.color;
            const textColor = getContrastingTextColor(reminder.color);
            reminderDiv.style.color = textColor;
            
            reminderDiv.style.padding = "10px";
            reminderDiv.style.margin = "5px 0";
            reminderDiv.style.borderRadius = "4px";
            
			if (reminder.date) {
				const dateDiv = document.createElement("div");
				dateDiv.textContent = new Date(reminder.date).toLocaleString();
				reminderDiv.appendChild(dateDiv);
			}

            const textDiv = document.createElement("div");
            textDiv.textContent = reminder.text;
            reminderDiv.appendChild(textDiv);

            const removeBtn = document.createElement("button");
            removeBtn.textContent = "Remove";
            removeBtn.addEventListener("click", () => {
                reminders[channel.id].splice(index, 1);
                renderReminders();
            });
            reminderDiv.appendChild(removeBtn);
            listDiv.appendChild(reminderDiv);
        });
    }
    renderReminders();

    // Add reminder form
    const form = document.createElement("form");
    
    // Date input
    const dateInput = document.createElement("input");
    dateInput.type = "datetime-local";
    form.appendChild(dateInput);

    // Text input
    const textInput = document.createElement("input");
    textInput.type = "text";
    textInput.placeholder = "Reminder text";
    textInput.required = true;
    form.appendChild(textInput);

    // Color picker
    const colorInput = document.createElement("input");
    colorInput.type = "color";
    colorInput.value = "#007bff";
    colorInput.style.marginLeft = "10px";
    form.appendChild(colorInput);

    // Submit button
    const addBtn = document.createElement("button");
    addBtn.type = "submit";
    addBtn.textContent = "Add Reminder";
    form.appendChild(addBtn);

    form.addEventListener("submit", (e) => {
        e.preventDefault();
        const newReminder = {
            date: dateInput.value || null,
            text: textInput.value,
            color: colorInput.value
        };
        reminders[channel.id].push(newReminder);
        dateInput.value = "";
        textInput.value = "";
        renderReminders();
    });
    container.appendChild(form);
}

/***********************
 * Initialize on DOM Ready
 ***********************/
document.addEventListener("DOMContentLoaded", () => {
    renderSidebar();
    if (categories.length > 0 && categories[0].channels.length > 0) {
        selectChannel(categories[0].channels[0]);
    }
});