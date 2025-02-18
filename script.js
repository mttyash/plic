(() => {
  // Helper to create elements with props and children.
  const el = (tag, props = {}, ...children) => {
    const e = document.createElement(tag);
    for (let [k, v] of Object.entries(props)) {
      if (k === 'class') e.className = v;
      else if (k === 'style') Object.assign(e.style, v);
      else if (k.startsWith('on') && typeof v === 'function')
        e.addEventListener(k.slice(2).toLowerCase(), v);
      else e[k] = v;
    }
    children.forEach(child => {
      if (typeof child === 'string') e.appendChild(document.createTextNode(child));
      else if (child) e.appendChild(child);
    });
    return e;
  };

  // Data & in‑memory storage
  const categories = [
    { name: "General", channels: [{ id: "text1", name: "General Chat", type: "text" }] },
    { name: "Learning", channels: [
        { id: "flashcard1", name: "Flashcards", type: "flashcard" },
        { id: "whiteboard1", name: "Whiteboard", type: "whiteboard" },
        { id: "code1", name: "Code Runner", type: "code" }
      ]
    },
    { name: "Reminders", channels: [{ id: "reminder1", name: "My Reminders", type: "reminder" }] }
  ];
  const chatMessages = {}, flashcards = {}, reminders = {};
  window.whiteboardData = window.whiteboardData || {};
  window.codeData = window.codeData || {};

  // Helper for file reading; returns a promise.
  const readFile = (file) => new Promise((res) => {
    const reader = new FileReader();
    reader.onload = e => res({ name: file.name, type: file.type, content: e.target.result });
    (file.type.startsWith("image/") || file.type.startsWith("audio/"))
      ? reader.readAsDataURL(file)
      : reader.readAsText(file);
  });

  // Sidebar – uses document fragment to minimize reflows.
  const renderSidebar = () => {
    const sidebar = document.querySelector(".sidebar");
    sidebar.innerHTML = "";
    sidebar.appendChild(el("button", { class: "collapse-btn", onclick: () => sidebar.classList.toggle("collapsed") }, "▶"));
    const frag = document.createDocumentFragment();
    categories.forEach(cat => {
      frag.appendChild(el("h2", {}, cat.name));
      const ul = el("ul", { class: "channel-list" });
      cat.channels.forEach(ch => {
        const li = el("li", {
          class: "channel-item",
          "data-channel-id": ch.id,
          "data-channel-type": ch.type,
          onclick: () => {
            if (ch.type === "function") {
              const codeCh = categories.flatMap(c => c.channels).find(ch => ch.type === "code");
              if (codeCh) { window.codeData[codeCh.id] = ch.code; selectChannel(codeCh); }
            } else selectChannel(ch);
          }
        }, ch.name);
        if (ch.type === "function") {
          li.appendChild(el("button", { style: { marginLeft: "10px" }, onclick: e => {
            e.stopPropagation();
            const funcCat = categories.find(c => c.name === "Functions");
            if (funcCat) { funcCat.channels = funcCat.channels.filter(x => x.id !== ch.id); renderSidebar(); }
          } }, "Delete"));
        }
        ul.appendChild(li);
      });
      frag.appendChild(ul);
    });
    frag.appendChild(el("div", { class: "version-text" }, "v1.13"));
    sidebar.appendChild(frag);
    if (!window.sidebarOutsideListenerAdded) {
      const collapseSidebar = e => { if (sidebar && !sidebar.contains(e.target)) sidebar.classList.add("collapsed"); };
      document.addEventListener("click", collapseSidebar);
      document.addEventListener("touchstart", collapseSidebar);
      window.sidebarOutsideListenerAdded = true;
    }
  };

  const selectChannel = channel => {
    document.querySelectorAll(".channel-item").forEach(item =>
      item.classList.toggle("active-channel", item.getAttribute("data-channel-id") === channel.id)
    );
    document.querySelector(".sidebar").classList.add("collapsed");
    renderChannel(channel);
  };

  // Channel dispatcher.
  const renderChannel = channel => {
    const main = document.querySelector(".main-content");
    main.innerHTML = "";
    ({
      text: () => renderTextChannel(main, channel),
      flashcard: () => renderFlashcardChannel(main, channel),
      whiteboard: () => renderWhiteboardChannel(main, channel),
      code: () => renderCodeChannel(main, channel),
      reminder: () => renderReminderChannel(main, channel)
    }[channel.type] || (() => {}))();
  };

  // 1. Text Channel – optimized with fragments and event delegation.
  const renderTextChannel = (container, channel) => {
    container.innerHTML = "";
    container.appendChild(el("h2", {}, "Text Channel"));
    const chatContainer = el("div", { class: "chat-container", style: { height: "90%" } });
    const messagesDiv = el("div", { class: "messages-area" });
    chatContainer.appendChild(messagesDiv);

    const updateMessages = () => {
      messagesDiv.innerHTML = "";
      const frag = document.createDocumentFragment();
      (chatMessages[channel.id] || []).forEach((msg, idx) => {
        if (typeof msg === "string") { 
          msg = { date: new Date().toLocaleString(), text: msg, files: [] }; 
          chatMessages[channel.id][idx] = msg; 
        }
        const msgContainer = el("div", { class: "message-container" });
        msgContainer.appendChild(el("div", { class: "message-date" }, msg.date));
        const contentDiv = el("div", { class: "message-content" });
        const textContainer = el("span");
        msg.text.split(/(https?:\/\/\S+|www\.\S+)/gi).forEach((part, i) => {
          if (!part) return;
          if (i % 2) {
            let url = /^www\./i.test(part) ? "http://" + part : part;
            try {
              new URL(url);
              textContainer.appendChild(el("a", { href: url, target: "_blank", rel: "noopener noreferrer" }, part));
            } catch { textContainer.appendChild(document.createTextNode(part)); }
          } else textContainer.appendChild(document.createTextNode(part));
        });
        contentDiv.appendChild(textContainer);
        if (msg.files?.length) {
          const filesDiv = el("div");
          msg.files.forEach(file => {
            const fileWrapper = el("div", { style: { border: "1px solid #ccc", padding: "5px", marginTop: "5px" } });
            if (file.type.startsWith("image/"))
              fileWrapper.appendChild(el("img", { src: file.content, style: { maxWidth: "200px" } }));
            else if (file.type.startsWith("audio/"))
              fileWrapper.appendChild(el("audio", { src: file.content, controls: true }));
            else if (file.type.startsWith("text/") || !file.type)
              fileWrapper.appendChild(el("pre", { style: { maxHeight: "150px", overflow: "auto" } }, file.content));
            else fileWrapper.textContent = file.name;
            fileWrapper.appendChild(el("button", { onclick: () => {
              const a = el("a");
              if (file.type.startsWith("image/") || file.type.startsWith("audio/"))
                a.href = file.content;
              else {
                const blob = new Blob([file.content], { type: file.type || "text/plain" });
                a.href = URL.createObjectURL(blob);
              }
              a.download = file.name; a.click();
            } }, "Download"));
            filesDiv.appendChild(fileWrapper);
          });
          contentDiv.appendChild(filesDiv);
        }
        msgContainer.appendChild(contentDiv);
        const btnContainer = el("div", { class: "toolbar" });
        btnContainer.appendChild(el("button", { onclick: () => {
          const editForm = el("form");
          const editInput = el("input", { type: "text", value: msg.text });
          editForm.appendChild(editInput);
        
          // Create a temporary copy of the attachments
          let tempFiles = msg.files.slice();
        
          const editFilesDiv = el("div");
          // Function to re‑render the list of attachments from tempFiles
          const renderEditFiles = () => {
            editFilesDiv.innerHTML = "";
            tempFiles.forEach((file, fIdx) => {
              const fileRow = el("div", {}, file.name);
              fileRow.appendChild(el("button", { type: "button", onclick: () => { 
                tempFiles.splice(fIdx, 1);
                renderEditFiles();
              } }, "Remove"));
              editFilesDiv.appendChild(fileRow);
            });
          };
          renderEditFiles();
          editForm.appendChild(editFilesDiv);
        
          const newFileInput = el("input", { type: "file", multiple: true, style: { display: "none" } });
          const newAttachBtn = el("button", { type: "button", onclick: e => { 
            e.preventDefault(); newFileInput.click(); 
          } }, "Attach File");
          editForm.appendChild(newAttachBtn);
          editForm.appendChild(newFileInput);
          newFileInput.addEventListener("change", async () => {
            for (const file of newFileInput.files)
              tempFiles.push(await readFile(file));
            renderEditFiles();
            newFileInput.value = "";
          });
          const saveBtn = el("button", { type: "submit" }, "Save");
          const cancelBtn = el("button", { type: "button", onclick: updateMessages }, "Cancel");
          editForm.append(saveBtn, cancelBtn);
          msgContainer.innerHTML = "";
          msgContainer.appendChild(editForm);
          editForm.addEventListener("submit", e => {
            e.preventDefault();
            msg.text = editInput.value;
            msg.files = tempFiles; // Commit the temporary changes
            updateMessages();
          });
        } }, "Edit"));        
        btnContainer.appendChild(el("button", { onclick: () => { 
          chatMessages[channel.id].splice(idx, 1); updateMessages(); 
        } }, "Remove"));
        msgContainer.appendChild(btnContainer);
        frag.appendChild(msgContainer);
      });
      messagesDiv.appendChild(frag);
    };

    chatMessages[channel.id] = chatMessages[channel.id] || [];
    updateMessages();

    const footerDiv = el("div", { class: "toolbar" });
    const textInput = el("input", { type: "text", placeholder: "Type a message...", style: { flex: "1", minWidth: "100px", maxWidth: "calc(100% - 120px)" } });
    footerDiv.appendChild(textInput);
    const fileInput = el("input", { type: "file", multiple: true, style: { display: "none" } });
    footerDiv.appendChild(el("button", { type: "button", onclick: () => fileInput.click() }, "Attach File"));
    footerDiv.appendChild(fileInput);
    footerDiv.appendChild(el("button", { type: "submit" }, "Send"));
    const fileListDiv = el("div");
    footerDiv.appendChild(fileListDiv);
    let attachedFiles = [];
    const updateFileList = () => {
      fileListDiv.innerHTML = "";
      attachedFiles.forEach((file, i) => {
        const fileDiv = el("div", {}, file.name);
        fileDiv.appendChild(el("button", { style: { marginLeft: "10px" }, onclick: () => {
          attachedFiles.splice(i, 1); updateFileList();
        } }, "Remove"));
        fileListDiv.appendChild(fileDiv);
      });
    };
    fileInput.addEventListener("change", async () => {
      for (const file of fileInput.files)
        attachedFiles.push(await readFile(file));
      updateFileList(); fileInput.value = "";
    });
    const form = el("form", { onsubmit: e => {
      e.preventDefault();
      const text = textInput.value;
      if ((typeof text === "string" && text.trim() !== "") || attachedFiles.length) {
        chatMessages[channel.id].push({ date: new Date().toLocaleString(), text, files: attachedFiles });
        updateMessages(); textInput.value = ""; attachedFiles = []; updateFileList();
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
      }
    }});
    form.appendChild(footerDiv);
    chatContainer.appendChild(form);
    container.appendChild(chatContainer);
  };

  // 2. Flashcard Maker & Tester – uses the same el() helper and fragments.
  const renderFlashcardChannel = (container, channel) => {
    container.innerHTML = "";
    container.appendChild(el("h2", {}, "Flashcard Maker & Tester"));
    const modeContainer = el("div"), creationDiv = el("div");
    const form = el("form", { class: "flashcard-form", onsubmit: e => {
      e.preventDefault();
      const q = questionInput.value.trim();
      if (!q) return;
      const answers = Array.from(answersContainer.querySelectorAll(".answer-row")).map(row => {
        const [inp, chk] = row.querySelectorAll("input");
        return inp.value.trim() ? { text: inp.value, correct: chk.checked } : null;
      }).filter(x => x);
      if (answers.length) {
        flashcards[channel.id] = flashcards[channel.id] || [];
        flashcards[channel.id].push({ question: q, answers });
        questionInput.value = ""; answersContainer.innerHTML = ""; addAnswerRow(); renderFlashcardsList();
      }
    }});
    const questionInput = el("input", { type: "text", placeholder: "Enter question here", required: true, style: { width: "100%" } });
    form.appendChild(questionInput);
    const answersContainer = el("div", { id: "answers-container" });
    form.appendChild(answersContainer);
    const addAnswerRow = (txt = "", corr = false) => {
      const row = el("div", { class: "answer-row" });
      row.appendChild(el("input", { type: "text", placeholder: "Answer", required: true, value: txt, style: { flex: "1", minWidth: "80px", maxWidth: "calc(100% - 120px)" } }));
      row.appendChild(el("input", { type: "checkbox", title: "Mark as correct answer", checked: corr }));
      row.appendChild(el("button", { type: "button", onclick: () => row.remove() }, "Remove"));
      answersContainer.appendChild(row);
    };
    addAnswerRow();
    form.appendChild(el("button", { type: "button", onclick: () => addAnswerRow() }, "Add Answer"));
    form.appendChild(el("button", { type: "submit" }, "Add Flashcard"));
    creationDiv.appendChild(form);
    const startTestBtn = el("button", { type: "button" }, "Start Test");
    creationDiv.appendChild(startTestBtn);
    // Export / Import buttons
    creationDiv.appendChild(el("button", { type: "button", onclick: () => {
      const data = flashcards[channel.id] || [];
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      el("a", { href: URL.createObjectURL(blob), download: "flashcards.json" }).click();
    }}, "Export Flashcards"));
    const importInput = el("input", { type: "file", accept: "application/json", style: { display: "none" },
      onchange: async e => {
        const file = e.target.files[0]; if (!file) return;
        const fileObj = await readFile(file);
        try {
          const imported = JSON.parse(fileObj.content);
          if (Array.isArray(imported)) { flashcards[channel.id] = imported; renderFlashcardsList(); }
        } catch {}
      }
    });
    creationDiv.appendChild(importInput);
    creationDiv.appendChild(el("button", { type: "button", onclick: () => importInput.click() }, "Import Flashcards"));
    const flashcardListDiv = el("div");
    creationDiv.appendChild(flashcardListDiv);
    const testDiv = el("div", { style: { display: "none" } });
    modeContainer.append(creationDiv, testDiv);
    container.appendChild(modeContainer);
    const renderFlashcardsList = () => {
      flashcardListDiv.innerHTML = "";
      (flashcards[channel.id] = flashcards[channel.id] || []).forEach((card, idx) => {
        const cardDiv = el("div", { class: "flashcard" });
        cardDiv.appendChild(el("p", {}, "Q: " + card.question));
        const ul = el("ul");
        card.answers.forEach(ans => ul.appendChild(el("li", {}, ans.text + (ans.correct ? " (Correct)" : ""))));
        cardDiv.appendChild(ul);
        const toolbar = el("div", { class: "toolbar" });
        toolbar.appendChild(el("button", { type: "button", onclick: function () {
          if (this.textContent === "Edit") {
            const qInput = el("input", { type: "text", value: card.question });
            cardDiv.replaceChild(qInput, cardDiv.querySelector("p"));
            const answersDiv = el("div");
            card.answers.forEach(ans => {
              const row = el("div", { class: "answer-row" });
              row.appendChild(el("input", { type: "text", value: ans.text }));
              row.appendChild(el("input", { type: "checkbox", checked: ans.correct }));
              answersDiv.appendChild(row);
            });
            answersDiv.appendChild(el("button", { type: "button", onclick: () => {
              const row = el("div", { class: "answer-row" });
              row.appendChild(el("input", { type: "text", placeholder: "New answer" }));
              row.appendChild(el("input", { type: "checkbox" }));
              answersDiv.appendChild(row);
            }}, "Add Answer"));
            cardDiv.replaceChild(answersDiv, ul);
            this.textContent = "Save";
          } else {
            const qInput = cardDiv.querySelector("input[type='text']");
            card.question = qInput.value;
            const newAns = [];
            cardDiv.querySelectorAll(".answer-row").forEach(row => {
              const [inp, chk] = row.querySelectorAll("input");
              if (inp.value.trim()) newAns.push({ text: inp.value, correct: chk.checked });
            });
            card.answers = newAns; renderFlashcardsList();
          }
        } }, "Edit"));
        toolbar.appendChild(el("button", { type: "button", onclick: () => { flashcards[channel.id].splice(idx, 1); renderFlashcardsList(); } }, "Remove"));
        cardDiv.appendChild(toolbar);
        flashcardListDiv.appendChild(cardDiv);
      });
      startTestBtn.disabled = !(flashcards[channel.id]?.length);
    };
    renderFlashcardsList();
    startTestBtn.addEventListener("click", () => {
      creationDiv.style.display = "none";
      renderTestMode(testDiv, channel);
      testDiv.style.display = "block";
    });
    const renderTestMode = (testContainer, channel) => {
      testContainer.innerHTML = "";
      const cards = [...(flashcards[channel.id] || [])].sort(() => Math.random() - 0.5);
      if (!cards.length) { testContainer.textContent = "No flashcards available for testing."; return; }
      const formTest = el("form", { onsubmit: e => {
        e.preventDefault();
        let score = 0;
        cards.forEach((card, idx) => {
          const selected = Array.from(formTest.querySelectorAll(`input[name="card${idx}"]:checked`)).map(i => +i.value);
          const correct = card.answers.map((ans, i) => ans.correct ? i : null).filter(x => x !== null);
          if (selected.sort().toString() === correct.sort().toString()) score++;
          formTest.querySelectorAll(`input[name="card${idx}"]`).forEach(inp => {
            const val = +inp.value;
            if (correct.includes(val)) inp.parentElement.classList.add("correct-highlight");
            else if (inp.checked) inp.parentElement.classList.add("incorrect-highlight");
            inp.disabled = true;
          });
        });
        formTest.querySelector("button[type='submit']").disabled = true;
        formTest.appendChild(el("div", { style: { marginTop: "10px" } }, `Your score: ${score} / ${cards.length}`));
      }});
      cards.forEach((card, idx) => {
        const qDiv = el("div", { style: { marginBottom: "10px" } });
        qDiv.appendChild(el("p", {}, "Q: " + card.question));
        card.answers.forEach((ans, aIdx) => {
          const label = el("label", { style: { display: "block" } });
          label.appendChild(el("input", { type: "checkbox", name: `card${idx}`, value: aIdx }));
          label.append(" " + ans.text);
          qDiv.appendChild(label);
        });
        formTest.appendChild(qDiv);
      });
      formTest.appendChild(el("button", { type: "submit" }, "Submit Answers"));
      formTest.appendChild(el("button", { type: "button", onclick: () => {
        testContainer.style.display = "none";
        creationDiv.style.display = "block";
      }}, "Back"));
      testContainer.appendChild(formTest);
    };
  };

  // 3. Whiteboard – performance improvements include caching math and using a redraw function with minimal updates.
  const renderWhiteboardChannel = (container, channel) => {
    container.innerHTML = "";
    container.appendChild(el("h2", {}, "Whiteboard"));
    const toolbar = el("div", { class: "toolbar", style: { display: "flex", gap: "10px", marginBottom: "10px" } });
    const colorPicker = el("input", { type: "color", value: "#000000", onchange: e => { brushColor = e.target.value; eraserMode = false; eraserButton.style.backgroundColor = ""; } });
    const sizeSlider = el("input", { type: "range", min: "1", max: "20", value: "1", onchange: e => brushSize = +e.target.value });
    const eraserButton = el("button", { onclick: () => { eraserMode = !eraserMode; eraserButton.style.backgroundColor = eraserMode ? "#ff0000" : ""; } }, "Eraser");
    const panModeButton = el("button", { onclick: () => { panMode = !panMode; panModeButton.style.backgroundColor = panMode ? "#cccccc" : ""; } }, "Pan Mode");
    const zoomInButton = el("button", { onclick: () => {
      const factor = 1.25, newScale = scale * factor, cx = canvas.width / 2, cy = canvas.height / 2;
      offsetX += cx * (1 / newScale - 1 / scale);
      offsetY += cy * (1 / newScale - 1 / scale); scale = newScale;
      redrawCanvas(); whiteboardPanZoomData[channel] = { offsetX, offsetY, scale };
    } }, "Zoom In");
    const zoomOutButton = el("button", { onclick: () => {
      const factor = 1.5, newScale = scale / factor, cx = canvas.width / 2, cy = canvas.height / 2;
      offsetX += cx * (1 / newScale - 1 / scale);
      offsetY += cy * (1 / newScale - 1 / scale); scale = newScale;
      redrawCanvas(); whiteboardPanZoomData[channel] = { offsetX, offsetY, scale };
    } }, "Zoom Out");
    toolbar.append(colorPicker, sizeSlider, eraserButton, panModeButton, zoomInButton, zoomOutButton);
    container.appendChild(toolbar);
    const canvas = el("canvas");
    container.appendChild(canvas);
    const context = canvas.getContext("2d");
    document.oncontextmenu = () => false;
    window.whiteboardData[channel] = window.whiteboardData[channel] || [];
    const drawings = window.whiteboardData[channel];
    window.whiteboardPanZoomData = window.whiteboardPanZoomData || {};
    whiteboardPanZoomData = window.whiteboardPanZoomData;
    whiteboardPanZoomData[channel] = whiteboardPanZoomData[channel] || { offsetX: 0, offsetY: 0, scale: 1 };
    let { offsetX, offsetY, scale } = whiteboardPanZoomData[channel],
        cursorX = 0, cursorY = 0, prevCursorX = 0, prevCursorY = 0,
        brushColor = "#000000", brushSize = 1, eraserMode = false, panMode = false;
    const toScreenX = x => (x + offsetX) * scale,
          toScreenY = y => (y + offsetY) * scale,
          toTrueX = x => (x / scale) - offsetX,
          toTrueY = y => (y / scale) - offsetY;
    const redrawCanvas = () => {
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
      context.fillStyle = "#fff"; context.fillRect(0, 0, canvas.width, canvas.height);
      drawings.forEach(line => {
        drawLine(toScreenX(line.x0), toScreenY(line.y0), toScreenX(line.x1), toScreenY(line.y1), line.color, line.size);
      });
      drawZoomAnchorDot();
    };
    const drawLine = (x0, y0, x1, y1, color, size) => {
      context.beginPath(); context.moveTo(x0, y0); context.lineTo(x1, y1);
      context.strokeStyle = color; context.lineWidth = size; context.lineCap = "round"; context.stroke();
    };
    const drawZoomAnchorDot = () => {
      const cx = canvas.width / 2, cy = canvas.height / 2, crossSize = 20;
      context.save(); context.globalCompositeOperation = "difference";
      context.beginPath(); context.moveTo(cx, cy - crossSize / 2); context.lineTo(cx, cy + crossSize / 2);
      context.strokeStyle = "white"; context.lineWidth = 1; context.stroke();
      context.beginPath(); context.moveTo(cx - crossSize / 2, cy); context.lineTo(cx + crossSize / 2, cy);
      context.strokeStyle = "white"; context.lineWidth = 2; context.stroke();
      context.restore();
    };
    const isNearLine = (x0, y0, x1, y1, px, py, thr) => {
      const A = px - x0, B = py - y0, C = x1 - x0, D = y1 - y0,
            dot = A * C + B * D, lenSq = C * C + D * D, param = lenSq ? dot / lenSq : -1;
      const [nx, ny] = param < 0 ? [x0, y0] : param > 1 ? [x1, y1] : [x0 + param * C, y0 + param * D];
      return Math.hypot(px - nx, py - ny) <= thr;
    };
    const drawCursorCircle = () => {
      redrawCanvas();
      const dispSize = eraserMode ? brushSize * 3 : brushSize;
      context.beginPath(); context.arc(cursorX, cursorY, dispSize / 2, 0, Math.PI * 2);
      context.strokeStyle = eraserMode ? "red" : "black"; context.lineWidth = 1; context.stroke();
    };
    let leftMouseDown = false;
    canvas.addEventListener("mousedown", e => {
      if (e.button === 0) leftMouseDown = true;
      cursorX = prevCursorX = e.offsetX; cursorY = prevCursorY = e.offsetY;
    });
    canvas.addEventListener("mousemove", e => {
      cursorX = e.offsetX; cursorY = e.offsetY;
      if (leftMouseDown) {
        if (panMode) {
          offsetX += (cursorX - prevCursorX) / scale;
          offsetY += (cursorY - prevCursorY) / scale;
          redrawCanvas();
        } else {
          const sx = toTrueX(cursorX), sy = toTrueY(cursorY),
                psx = toTrueX(prevCursorX), psy = toTrueY(prevCursorY);
          if (eraserMode) {
            for (let i = drawings.length - 1; i >= 0; i--)
              if (isNearLine(drawings[i].x0, drawings[i].y0, drawings[i].x1, drawings[i].y1, sx, sy, (brushSize / scale) * 2))
                drawings.splice(i, 1);
            window.whiteboardData[channel] = drawings; redrawCanvas();
          } else {
            drawings.push({ x0: psx, y0: psy, x1: sx, y1: sy, color: brushColor, size: brushSize });
            drawLine(prevCursorX, prevCursorY, cursorX, cursorY, brushColor, brushSize);
          }
        }
      }
      prevCursorX = cursorX; prevCursorY = cursorY; drawCursorCircle();
    });
    canvas.addEventListener("mouseup", () => leftMouseDown = false);
    const prevTouches = [null];
    canvas.addEventListener("touchstart", e => { if (e.touches.length) prevTouches[0] = e.touches[0]; });
    canvas.addEventListener("touchmove", e => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      if (e.touches.length !== 1) return;
      const touch = e.touches[0];
      cursorX = touch.clientX - rect.left; cursorY = touch.clientY - rect.top;
      if (panMode) {
        const prevTouch = prevTouches[0],
              prevTouchX = prevTouch.clientX - rect.left, prevTouchY = prevTouch.clientY - rect.top;
        offsetX += (cursorX - prevTouchX) / scale;
        offsetY += (cursorY - prevTouchY) / scale; redrawCanvas();
        whiteboardPanZoomData[channel] = { offsetX, offsetY, scale };
        prevTouches[0] = touch;
      } else {
        const sx = toTrueX(cursorX), sy = toTrueY(cursorY),
              prevTouch = prevTouches[0],
              prevTouchX = prevTouch.clientX - rect.left, prevTouchY = prevTouch.clientY - rect.top,
              psx = toTrueX(prevTouchX), psy = toTrueY(prevTouchY);
        if (eraserMode) {
          for (let i = drawings.length - 1; i >= 0; i--)
            if (isNearLine(drawings[i].x0, drawings[i].y0, drawings[i].x1, drawings[i].y1, sx, sy, (brushSize / scale) * 2))
              drawings.splice(i, 1);
          window.whiteboardData[channel] = drawings; redrawCanvas();
        } else {
          drawings.push({ x0: psx, y0: psy, x1: sx, y1: sy, color: brushColor, size: brushSize });
          drawLine(prevTouchX, prevTouchY, cursorX, cursorY, brushColor, brushSize);
          window.whiteboardData[channel] = drawings;
        }
        prevTouches[0] = touch;
      }
      drawCursorCircle();
    });
    canvas.addEventListener("touchend", e => { if (e.touches.length === 0) prevTouches[0] = null; });
    window.addEventListener("resize", redrawCanvas);
    redrawCanvas();
  };

  // 4. Code Runner – includes save, export/import, and live code execution.
  const renderCodeChannel = (container, channel) => {
    container.innerHTML = "";
    const headerContainer = el("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center" } });
    headerContainer.appendChild(el("h2", {}, "Code Runner"));
    const saveBtn = el("button", {}, "Save");
    headerContainer.appendChild(saveBtn);
    container.appendChild(headerContainer);
    const ioContainer = el("div", { class: "toolbar", style: { margin: "10px 0", display: "flex", alignItems: "center" } });
    ioContainer.appendChild(el("button", { onclick: () => {
      const funcCat = categories.find(c => c.name === "Functions");
      if (!funcCat?.channels?.length) return;
      const blob = new Blob([JSON.stringify(funcCat.channels, null, 2)], { type: "application/json" });
      el("a", { href: URL.createObjectURL(blob), download: "code_functions.json" }).click();
    } }, "Export"));
    ioContainer.appendChild(el("button", { onclick: () => {
      const importInput = el("input", { type: "file", accept: "application/json", style: { display: "none" } });
      importInput.addEventListener("change", async e => {
        const file = e.target.files[0]; if (!file) return;
        const fileObj = await readFile(file);
        try {
          const imported = JSON.parse(fileObj.content);
          if (Array.isArray(imported)) {
            let funcCat = categories.find(c => c.name === "Functions");
            if (!funcCat) { funcCat = { name: "Functions", channels: [] }; categories.push(funcCat); }
            imported.forEach(imp => {
              const idx = funcCat.channels.findIndex(ch => ch.name.toLowerCase() === imp.name.toLowerCase());
              idx !== -1 ? funcCat.channels[idx] = imp : funcCat.channels.push(imp);
            });
            renderSidebar();
          }
        } catch {}
      });
      importInput.click();
    } }, "Import"));
    const functionNameInput = el("input", { type: "text", placeholder: "Function Name..", style: { flex: "1", minWidth: "80px", maxWidth: "calc(100% - 120px)" } });
    ioContainer.appendChild(functionNameInput);
    container.appendChild(ioContainer);
    const wrapper = el("div", { class: "code-runner-wrapper", style: { height: "calc(100% - 40px)", position: "relative" } });
    container.appendChild(wrapper);
    const runBtn = el("button", { class: "run-btn" }, "Run Code");
    wrapper.appendChild(runBtn);
    const codeArea = el("textarea", { class: "code-runner-textarea", style: { boxSizing: "border-box", resize: "none" } });
    wrapper.appendChild(codeArea);
    if (window.codeData[channel.id]) codeArea.value = window.codeData[channel.id];
    codeArea.addEventListener("input", () => window.codeData[channel.id] = codeArea.value);
    const outputDiv = el("div", { class: "code-runner-output" });
    wrapper.appendChild(outputDiv);
    runBtn.addEventListener("click", () => {
      const code = codeArea.value, logs = [];
      const origLog = console.log;
      console.log = (...args) => { logs.push(args.join(" ")); origLog(...args); };
      try {
        const result = eval(code);
        outputDiv.textContent = logs.length ? logs.join("\n") : (result !== undefined ? result : "Code executed successfully.");
      } catch (err) { outputDiv.textContent = "Error: " + err; }
      console.log = origLog;
    });
    functionNameInput.addEventListener("input", () => {
      const funcCat = categories.find(c => c.name === "Functions");
      saveBtn.textContent = (funcCat && funcCat.channels.find(ch => ch.name.toLowerCase() === functionNameInput.value.trim().toLowerCase()))
        ? "Update" : "Save";
    });
    saveBtn.addEventListener("click", () => {
      const code = codeArea.value;
      if (!code.trim()) return;
      let funcCat = categories.find(c => c.name === "Functions");
      if (!funcCat) { funcCat = { name: "Functions", channels: [] }; categories.push(funcCat); }
      let name = functionNameInput.value.trim() || "Saved Function " + (funcCat.channels.length + 1);
      const idx = funcCat.channels.findIndex(ch => ch.name.toLowerCase() === name.toLowerCase());
      if (idx !== -1) funcCat.channels[idx].code = code;
      else {
        const id = "func_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
        funcCat.channels.push({ id, name, type: "function", code });
      }
      renderSidebar(); functionNameInput.value = ""; saveBtn.textContent = "Save";
    });
  };

  // 5. Reminders – includes dynamic contrast calculation.
  const renderReminderChannel = (container, channel) => {
    container.innerHTML = "";
    container.appendChild(el("h2", {}, "Reminders"));
    const getContrastingTextColor = bg => {
      const parse = c => {
        c = c.trim().toLowerCase();
        if (c.startsWith('#')) {
          let hex = c.slice(1);
          if ([3, 4].includes(hex.length)) hex = hex.split('').map(ch => ch + ch).join('');
          return { r: parseInt(hex.substr(0, 2), 16), g: parseInt(hex.substr(2, 2), 16), b: parseInt(hex.substr(4, 2), 16) };
        }
        if (c.startsWith("rgb")) {
          const parts = c.match(/(\d+)/g) || [];
          return { r: +parts[0] || 0, g: +parts[1] || 0, b: +parts[2] || 0 };
        }
        return { r: 255, g: 255, b: 255 };
      };
      const { r, g, b } = parse(bg);
      const lum = (r, g, b) => { const f = c => (c /= 255) <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
      return lum(r, g, b) > 0.179 ? "#000000" : "#ffffff";
    };
    reminders[channel.id] = reminders[channel.id] || [];
    const listDiv = el("div");
    container.appendChild(listDiv);
    const renderReminders = () => {
      listDiv.innerHTML = "";
      reminders[channel.id].forEach((rem, idx) => {
        const remDiv = el("div", { class: "reminder-container", style: { backgroundColor: rem.color, color: getContrastingTextColor(rem.color), padding: "10px", margin: "5px 0", borderRadius: "4px" } });
        if (rem.date) remDiv.appendChild(el("div", {}, new Date(rem.date).toLocaleString()));
        remDiv.appendChild(el("div", {}, rem.text));
        remDiv.appendChild(el("button", { onclick: () => { reminders[channel.id].splice(idx, 1); renderReminders(); } }, "Remove"));
        listDiv.appendChild(remDiv);
      });
    };
    renderReminders();
    const form = el("form", { onsubmit: e => {
      e.preventDefault();
      reminders[channel.id].push({ date: dateInput.value || null, text: textInput.value, color: colorInput.value });
      dateInput.value = ""; textInput.value = ""; renderReminders();
    }});
    const dateInput = el("input", { type: "datetime-local" });
    const textInput = el("input", { type: "text", placeholder: "Reminder text", required: true });
    const colorInput = el("input", { type: "color", value: "#007bff", style: { marginLeft: "10px" } });
    form.append(dateInput, textInput, colorInput, el("button", { type: "submit" }, "Add Reminder"));
    container.appendChild(form);
  };

  // Initialize on DOM ready.
  document.addEventListener("DOMContentLoaded", () => {
    renderSidebar();
    if (categories.length && categories[0].channels.length)
      selectChannel(categories[0].channels[0]);
  });
})();