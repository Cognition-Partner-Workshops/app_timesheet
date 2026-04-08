/**
 * Voice Translator - Frontend Logic
 * Real-time multilingual speech recognition and translation
 */

(function () {
    "use strict";

    // ==================== State ====================
    const state = {
        isRecording: false,
        isConnected: false,
        mediaStream: null,
        audioContext: null,
        processor: null,
        analyser: null,
        socket: null,
        ttsQueue: [],
        isPlayingTTS: false,
        resultCounter: 0,
        translationMode: "google",
    };

    // ==================== DOM Elements ====================
    const elements = {
        recordBtn: document.getElementById("recordBtn"),
        recordHint: document.getElementById("recordHint"),
        connectionStatus: document.getElementById("connectionStatus"),
        recognitionLang: document.getElementById("recognitionLang"),
        targetLang: document.getElementById("targetLang"),
        enableTTS: document.getElementById("enableTTS"),
        enableDiarization: document.getElementById("enableDiarization"),
        ttsVoice: document.getElementById("ttsVoice"),
        recognitionResults: document.getElementById("recognitionResults"),
        translationResults: document.getElementById("translationResults"),
        detectedLang: document.getElementById("detectedLang"),
        clearBtn: document.getElementById("clearBtn"),
        resetSpeakersBtn: document.getElementById("resetSpeakersBtn"),
        ttsPlayer: document.getElementById("ttsPlayer"),
        audioVisualizer: document.getElementById("audioVisualizer"),
        visualizerCanvas: document.getElementById("visualizerCanvas"),
        translationEngine: document.getElementById("translationEngine"),
    };

    // ==================== Socket.IO Connection ====================

    function initSocket() {
        state.socket = io({
            transports: ["websocket", "polling"],
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionAttempts: 10,
        });

        state.socket.on("connect", function () {
            state.isConnected = true;
            updateConnectionStatus("connected", "已连接 / Connected");
            elements.recordBtn.disabled = false;
            showToast("已连接服务器", "success");
        });

        state.socket.on("disconnect", function () {
            state.isConnected = false;
            updateConnectionStatus("disconnected", "已断开 / Disconnected");
            if (state.isRecording) {
                stopRecording();
            }
            showToast("连接已断开，正在重连...", "error");
        });

        state.socket.on("connect_error", function () {
            updateConnectionStatus("error", "连接失败 / Error");
        });

        state.socket.on("status", function (data) {
            showToast(data.message, data.type || "info");
        });

        state.socket.on("recognition_result", function (data) {
            handleRecognitionResult(data);
        });

        state.socket.on("translation_result", function (data) {
            handleTranslationResult(data);
        });

        state.socket.on("tts_result", function (data) {
            handleTTSResult(data);
        });

        state.socket.on("error", function (data) {
            showToast("错误: " + data.message, "error");
        });
    }

    // ==================== Connection Status ====================

    function updateConnectionStatus(status, text) {
        var dot = elements.connectionStatus.querySelector(".status-dot");
        var statusText = elements.connectionStatus.querySelector(".status-text");

        dot.className = "status-dot";
        if (status === "connected") {
            dot.classList.add("connected");
        } else if (status === "error") {
            dot.classList.add("error");
        }
        statusText.textContent = text;
    }

    // ==================== Audio Resampling ====================

    /**
     * Downsample audio buffer from inputSampleRate to outputSampleRate.
     * Uses linear interpolation for quality.
     */
    function downsampleBuffer(buffer, inputSampleRate, outputSampleRate) {
        if (inputSampleRate === outputSampleRate) {
            return buffer;
        }
        if (inputSampleRate < outputSampleRate) {
            console.warn("Cannot upsample from", inputSampleRate, "to", outputSampleRate);
            return buffer;
        }
        var ratio = inputSampleRate / outputSampleRate;
        var newLength = Math.round(buffer.length / ratio);
        var result = new Float32Array(newLength);
        for (var i = 0; i < newLength; i++) {
            var index = i * ratio;
            var lower = Math.floor(index);
            var upper = Math.min(Math.ceil(index), buffer.length - 1);
            var frac = index - lower;
            result[i] = buffer[lower] * (1 - frac) + buffer[upper] * frac;
        }
        return result;
    }

    // ==================== Audio Recording ====================

    async function startRecording() {
        try {
            // Request microphone access (don't force sampleRate - let browser use native)
            state.mediaStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    channelCount: 1,
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                },
            });

            // Create audio context with default (native) sample rate
            state.audioContext = new (window.AudioContext ||
                window.webkitAudioContext)();

            // Ensure AudioContext is running (Chrome autoplay policy)
            if (state.audioContext.state === "suspended") {
                await state.audioContext.resume();
            }

            var nativeSampleRate = state.audioContext.sampleRate;
            var TARGET_SAMPLE_RATE = 16000;
            console.log("AudioContext state:", state.audioContext.state);
            console.log("Native sample rate:", nativeSampleRate);
            console.log("Target sample rate:", TARGET_SAMPLE_RATE);

            var source = state.audioContext.createMediaStreamSource(
                state.mediaStream
            );

            // Create analyser for visualization
            state.analyser = state.audioContext.createAnalyser();
            state.analyser.fftSize = 256;
            source.connect(state.analyser);

            // Create script processor for audio data
            var bufferSize = 4096;
            state.processor = state.audioContext.createScriptProcessor(
                bufferSize,
                1,
                1
            );

            var audioChunks = [];
            var collectedSamples = 0; // 16kHz equivalent samples

            // VAD (Voice Activity Detection) parameters
            var vadSpeechThreshold = 0.01; // Energy threshold to detect speech
            var vadSilenceThreshold = 0.005; // Energy threshold for silence
            var isSpeaking = false;
            var silenceFrames = 0;
            var speechFrames = 0;
            // Calculate frames needed based on native sample rate
            // Each frame = bufferSize samples at native rate
            var frameDuration = bufferSize / nativeSampleRate; // seconds per frame
            // Send after ~0.5s of silence following speech
            var silenceFramesNeeded = Math.ceil(0.5 / frameDuration);
            // Minimum speech frames before considering it valid (~0.3s)
            var minSpeechFrames = Math.ceil(0.3 / frameDuration);
            // Maximum chunk duration: force send after 3s to avoid long waits
            var maxSamplesToSend = TARGET_SAMPLE_RATE * 3;
            // Minimum audio to send (~0.5s at 16kHz)
            var minSamplesToSend = TARGET_SAMPLE_RATE * 0.5;
            // Hard timeout: force send after 8s regardless of VAD
            var hardTimeoutSamples = TARGET_SAMPLE_RATE * 8;

            var frameCount = 0;

            console.log("VAD config: frameDuration=", frameDuration.toFixed(3),
                "silenceFramesNeeded=", silenceFramesNeeded,
                "minSpeechFrames=", minSpeechFrames);

            state.processor.onaudioprocess = function (e) {
                if (!state.isRecording) return;

                var inputData = e.inputBuffer.getChannelData(0);

                // Downsample from native rate to 16kHz
                var resampled = downsampleBuffer(inputData, nativeSampleRate, TARGET_SAMPLE_RATE);

                // Convert float32 to int16 (16-bit PCM)
                var int16Data = new Int16Array(resampled.length);
                for (var i = 0; i < resampled.length; i++) {
                    var s = Math.max(-1, Math.min(1, resampled[i]));
                    int16Data[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
                }

                // Calculate RMS energy for VAD (use original input)
                var sumSquares = 0;
                for (var j = 0; j < inputData.length; j++) {
                    sumSquares += inputData[j] * inputData[j];
                }
                var rms = Math.sqrt(sumSquares / inputData.length);

                audioChunks.push(int16Data);
                collectedSamples += resampled.length;

                // Periodic logging (every ~2 seconds)
                frameCount++;
                var logInterval = Math.ceil(2.0 / frameDuration);
                if (frameCount % logInterval === 0) {
                    console.log("Audio: frame=" + frameCount +
                        " rms=" + rms.toFixed(4) +
                        " samples16k=" + collectedSamples +
                        " speaking=" + isSpeaking +
                        " speechF=" + speechFrames +
                        " silenceF=" + silenceFrames);
                }

                if (rms > vadSpeechThreshold) {
                    // Speech detected
                    isSpeaking = true;
                    speechFrames++;
                    silenceFrames = 0;
                } else if (isSpeaking && rms < vadSilenceThreshold) {
                    // Silence after speech
                    silenceFrames++;
                }

                // Send conditions:
                // 1. Speech ended (silence after valid speech)
                // 2. Max duration reached during speech (force send)
                // 3. Hard timeout reached (force send regardless)
                var shouldSend = false;
                var sendReason = "";

                if (isSpeaking && silenceFrames >= silenceFramesNeeded &&
                    speechFrames >= minSpeechFrames &&
                    collectedSamples >= minSamplesToSend) {
                    shouldSend = true;
                    sendReason = "speech_ended";
                } else if (collectedSamples >= maxSamplesToSend &&
                           speechFrames >= minSpeechFrames) {
                    shouldSend = true;
                    sendReason = "max_duration";
                } else if (collectedSamples >= hardTimeoutSamples) {
                    // Hard timeout - send regardless of speech detection
                    shouldSend = true;
                    sendReason = "hard_timeout";
                }

                if (shouldSend) {
                    console.log("Sending audio: reason=" + sendReason +
                        " samples=" + collectedSamples +
                        " duration=" + (collectedSamples / TARGET_SAMPLE_RATE).toFixed(2) + "s" +
                        " speechFrames=" + speechFrames);
                    sendAudioData(audioChunks);
                    audioChunks = [];
                    collectedSamples = 0;
                    isSpeaking = false;
                    silenceFrames = 0;
                    speechFrames = 0;
                }
            };

            source.connect(state.processor);
            // Connect through silent gain node (keeps processor alive, prevents feedback)
            var silentGain = state.audioContext.createGain();
            silentGain.gain.value = 0;
            state.processor.connect(silentGain);
            silentGain.connect(state.audioContext.destination);

            // Listen for AudioContext state changes
            state.audioContext.onstatechange = function () {
                console.log("AudioContext state changed to:", state.audioContext.state);
                if (state.audioContext.state === "suspended" && state.isRecording) {
                    console.warn("AudioContext suspended during recording, attempting resume...");
                    state.audioContext.resume();
                }
            };

            // Update UI
            state.isRecording = true;
            elements.recordBtn.classList.add("recording");
            elements.recordHint.textContent = "录音中... 点击停止 / Recording...";
            elements.recordHint.classList.add("active");
            elements.audioVisualizer.classList.add("active");

            // Start visualization
            drawVisualizer();

            showToast("开始录音 / Recording started", "success");
        } catch (err) {
            console.error("Microphone access error:", err);
            if (err.name === "NotAllowedError") {
                showToast("请允许麦克风访问 / Please allow microphone access", "error");
            } else {
                showToast("麦克风错误: " + err.message, "error");
            }
        }
    }

    function stopRecording() {
        state.isRecording = false;

        // Stop media stream
        if (state.mediaStream) {
            state.mediaStream.getTracks().forEach(function (track) {
                track.stop();
            });
            state.mediaStream = null;
        }

        // Close audio context
        if (state.processor) {
            state.processor.disconnect();
            state.processor = null;
        }

        if (state.audioContext) {
            state.audioContext.close();
            state.audioContext = null;
        }

        state.analyser = null;

        // Update UI
        elements.recordBtn.classList.remove("recording");
        elements.recordHint.textContent = "点击开始录音 / Click to start";
        elements.recordHint.classList.remove("active");
        elements.audioVisualizer.classList.remove("active");

        showToast("录音已停止 / Recording stopped", "info");
    }

    function sendAudioData(chunks) {
        if (!state.isConnected || !state.socket) {
            console.warn("Cannot send audio: connected=" + state.isConnected);
            return;
        }

        // Merge chunks into single buffer
        var totalLength = 0;
        chunks.forEach(function (chunk) {
            totalLength += chunk.length;
        });

        var merged = new Int16Array(totalLength);
        var offset = 0;
        chunks.forEach(function (chunk) {
            merged.set(chunk, offset);
            offset += chunk.length;
        });

        console.log("Emitting audio_data: " + totalLength + " samples (" +
            (totalLength / 16000).toFixed(2) + "s at 16kHz), " +
            merged.buffer.byteLength + " bytes");

        // Send to server
        state.socket.emit("audio_data", {
            audio: merged.buffer,
            language: elements.recognitionLang.value,
            target_lang: elements.targetLang.value,
            enable_tts: elements.enableTTS.checked,
            tts_voice: elements.ttsVoice.value || null,
            translation_mode: state.translationMode,
            enable_diarization: elements.enableDiarization.checked,
        });
    }

    // ==================== Audio Visualizer ====================

    function drawVisualizer() {
        if (!state.isRecording || !state.analyser) return;

        var canvas = elements.visualizerCanvas;
        var ctx = canvas.getContext("2d");
        var bufferLength = state.analyser.frequencyBinCount;
        var dataArray = new Uint8Array(bufferLength);

        function draw() {
            if (!state.isRecording) return;
            requestAnimationFrame(draw);

            state.analyser.getByteFrequencyData(dataArray);

            ctx.fillStyle = "rgba(15, 23, 42, 0.8)";
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            var barWidth = (canvas.width / bufferLength) * 2.5;
            var barHeight;
            var x = 0;

            for (var i = 0; i < bufferLength; i++) {
                barHeight = (dataArray[i] / 255) * canvas.height * 0.8;

                var gradient = ctx.createLinearGradient(
                    0,
                    canvas.height,
                    0,
                    canvas.height - barHeight
                );
                gradient.addColorStop(0, "rgba(79, 70, 229, 0.6)");
                gradient.addColorStop(1, "rgba(129, 140, 248, 0.9)");
                ctx.fillStyle = gradient;

                ctx.fillRect(
                    x,
                    canvas.height - barHeight,
                    barWidth - 1,
                    barHeight
                );
                x += barWidth;
            }
        }

        draw();
    }

    // ==================== Result Handlers ====================

    function handleRecognitionResult(data) {
        if (!data.text) return;

        state.resultCounter++;
        var id = "rec-" + state.resultCounter;

        // Update language badge
        if (data.language_name) {
            elements.detectedLang.textContent = data.language_name;
            elements.detectedLang.classList.add("visible");
        }

        // Clear placeholder
        var placeholder =
            elements.recognitionResults.querySelector(".placeholder-text");
        if (placeholder) {
            placeholder.remove();
        }

        // Create result item
        var item = document.createElement("div");
        item.className = "result-item";
        item.id = id;
        item.setAttribute("data-text", data.text);

        // Speaker info
        var speakerHtml = "";
        if (data.speaker && data.speaker.speaker_id !== "unknown") {
            var color = data.speaker.speaker_color || "#64748b";
            speakerHtml =
                '<span class="speaker-badge" style="background:' +
                color +
                '20;color:' +
                color +
                ';border-color:' +
                color +
                '">' +
                '<span class="speaker-dot" style="background:' +
                color +
                '"></span>' +
                escapeHtml(data.speaker.speaker_label) +
                "</span>";
            item.style.borderLeftColor = color;
        }

        var confidence = data.confidence
            ? " (" + Math.round(data.confidence * 100) + "%)"
            : "";

        item.innerHTML =
            (speakerHtml ? '<div class="result-speaker">' + speakerHtml + "</div>" : "") +
            '<div class="result-text">' +
            escapeHtml(data.text) +
            "</div>" +
            '<div class="result-meta">' +
            "<span>" +
            (data.language_name || data.language || "") +
            confidence +
            "</span>" +
            "<span>" +
            getCurrentTime() +
            "</span>" +
            "</div>";

        // Insert at top
        elements.recognitionResults.insertBefore(
            item,
            elements.recognitionResults.firstChild
        );

        // Auto-scroll
        elements.recognitionResults.scrollTop = 0;
    }

    function handleTranslationResult(data) {
        if (!data.translated) return;

        // Clear placeholder
        var placeholder =
            elements.translationResults.querySelector(".placeholder-text");
        if (placeholder) {
            placeholder.remove();
        }

        // Create result item
        var item = document.createElement("div");
        item.className = "result-item translation";

        // Speaker info
        var speakerHtml = "";
        if (data.speaker && data.speaker.speaker_id !== "unknown") {
            var color = data.speaker.speaker_color || "#64748b";
            speakerHtml =
                '<span class="speaker-badge" style="background:' +
                color +
                '20;color:' +
                color +
                ';border-color:' +
                color +
                '">' +
                '<span class="speaker-dot" style="background:' +
                color +
                '"></span>' +
                escapeHtml(data.speaker.speaker_label) +
                "</span>";
            item.style.borderLeftColor = color;
        }

        var langInfo =
            (data.source_label || data.source_lang || "") +
            " → " +
            (data.target_label || data.target_lang || "");

        var engineBadge = "";
        if (data.engine) {
            var engineLabel = data.engine === "ai" ? "AI" : "Google";
            engineBadge =
                '<span class="engine-badge engine-' +
                data.engine +
                '">' +
                engineLabel +
                "</span>";
        }

        item.innerHTML =
            (speakerHtml ? '<div class="result-speaker">' + speakerHtml + "</div>" : "") +
            '<div class="result-text">' +
            escapeHtml(data.translated) +
            "</div>" +
            '<div class="result-meta">' +
            "<span>" +
            langInfo +
            engineBadge +
            "</span>" +
            '<button class="tts-btn" onclick="window.VT.playText(\'' +
            escapeAttr(data.translated) +
            "', '" +
            (data.target_lang || "zh") +
            "')\">" +
            "&#x1f50a; 播放" +
            "</button>" +
            "</div>";

        // Insert at top
        elements.translationResults.insertBefore(
            item,
            elements.translationResults.firstChild
        );

        elements.translationResults.scrollTop = 0;
    }

    function handleTTSResult(data) {
        if (!data.audio_url) return;

        // Add to TTS queue
        state.ttsQueue.push(data);

        // Play if not already playing
        if (!state.isPlayingTTS) {
            playNextTTS();
        }
    }

    // ==================== TTS Playback ====================

    function playNextTTS() {
        if (state.ttsQueue.length === 0) {
            state.isPlayingTTS = false;
            return;
        }

        state.isPlayingTTS = true;
        var data = state.ttsQueue.shift();

        elements.ttsPlayer.src = data.audio_url;
        elements.ttsPlayer.play().catch(function (err) {
            console.warn("TTS play error:", err);
            playNextTTS();
        });

        elements.ttsPlayer.onended = function () {
            playNextTTS();
        };

        elements.ttsPlayer.onerror = function () {
            playNextTTS();
        };
    }

    // Manual TTS playback
    function playText(text, lang) {
        if (!state.socket || !state.isConnected) return;

        // Request TTS from server via dedicated tts_request event
        state.socket.emit("tts_request", {
            text: text,
            language: lang,
            voice: elements.ttsVoice.value || null,
        });
    }

    // ==================== Voice Options ====================

    function loadVoiceOptions() {
        fetch("/api/languages")
            .then(function (res) {
                return res.json();
            })
            .then(function (data) {
                if (data.tts_voices) {
                    updateVoiceSelect(data.tts_voices);
                }
            })
            .catch(function (err) {
                console.error("Failed to load voice options:", err);
            });
    }

    function updateVoiceSelect(voices) {
        var select = elements.ttsVoice;
        // Keep default option
        select.innerHTML = '<option value="">默认 / Default</option>';

        var targetLang = elements.targetLang.value;
        var langVoices = voices[targetLang] || [];

        langVoices.forEach(function (voice) {
            var option = document.createElement("option");
            option.value = voice.id;
            option.textContent = voice.name;
            select.appendChild(option);
        });
    }

    // ==================== UI Helpers ====================

    function showToast(message, type) {
        type = type || "info";

        var toast = document.createElement("div");
        toast.className = "toast " + type;
        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(function () {
            toast.style.opacity = "0";
            toast.style.transform = "translateY(20px)";
            toast.style.transition = "all 0.3s ease-out";
            setTimeout(function () {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, 3000);
    }

    function clearResults() {
        elements.recognitionResults.innerHTML =
            '<div class="placeholder-text">等待语音输入...</div>';
        elements.translationResults.innerHTML =
            '<div class="placeholder-text">翻译将在识别后自动进行...</div>';
        elements.detectedLang.classList.remove("visible");
        state.resultCounter = 0;
        state.ttsQueue = [];
        showToast("已清除记录 / Cleared", "info");
    }

    function getCurrentTime() {
        var now = new Date();
        return (
            String(now.getHours()).padStart(2, "0") +
            ":" +
            String(now.getMinutes()).padStart(2, "0") +
            ":" +
            String(now.getSeconds()).padStart(2, "0")
        );
    }

    function escapeHtml(str) {
        var div = document.createElement("div");
        div.appendChild(document.createTextNode(str));
        return div.innerHTML;
    }

    function escapeAttr(str) {
        return str
            .replace(/\\/g, "\\\\")
            .replace(/'/g, "\\'")
            .replace(/"/g, '&quot;')
            .replace(/\n/g, "\\n");
    }

    // ==================== Event Listeners ====================

    function bindEvents() {
        // Record button
        elements.recordBtn.addEventListener("click", function () {
            if (state.isRecording) {
                stopRecording();
            } else {
                startRecording();
            }
        });

        // Clear button
        elements.clearBtn.addEventListener("click", clearResults);

        // Reset speakers button
        if (elements.resetSpeakersBtn) {
            elements.resetSpeakersBtn.addEventListener("click", function () {
                if (state.socket && state.isConnected) {
                    state.socket.emit("reset_speakers");
                }
            });
        }

        // Translation engine toggle
        if (elements.translationEngine) {
            var btns = elements.translationEngine.querySelectorAll(".engine-btn");
            btns.forEach(function (btn) {
                btn.addEventListener("click", function () {
                    var engine = btn.getAttribute("data-engine");

                    // If switching to AI, trigger lazy init
                    if (engine === "ai") {
                        btn.textContent = "AI 加载中...";
                        fetch("/api/init-ai-translator", { method: "POST" })
                            .then(function (res) { return res.json(); })
                            .then(function (data) {
                                var aiEngine = data.engines.find(
                                    function (e) { return e.id === "ai"; }
                                );
                                if (aiEngine && aiEngine.available) {
                                    btn.textContent = "AI 模型";
                                    showToast("AI翻译已就绪", "success");
                                } else {
                                    btn.textContent = "AI 模型";
                                    showToast(
                                        "AI翻译初始化中，请稍后再试",
                                        "info"
                                    );
                                }
                            })
                            .catch(function () {
                                btn.textContent = "AI 模型";
                                showToast("AI翻译初始化失败", "error");
                            });
                    }

                    state.translationMode = engine;
                    btns.forEach(function (b) {
                        b.classList.remove("active");
                    });
                    btn.classList.add("active");
                });
            });
        }

        // Target language change - update voice options
        elements.targetLang.addEventListener("change", function () {
            loadVoiceOptions();
        });

        // Keyboard shortcuts
        document.addEventListener("keydown", function (e) {
            // Space to toggle recording
            if (
                e.code === "Space" &&
                !e.target.matches("input, select, textarea, button")
            ) {
                e.preventDefault();
                elements.recordBtn.click();
            }
        });
    }

    // ==================== Initialization ====================

    function init() {
        console.log("Voice Translator initializing...");

        // Check browser support
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            showToast(
                "您的浏览器不支持麦克风访问 / Browser not supported",
                "error"
            );
            elements.recordBtn.disabled = true;
            return;
        }

        // Initialize socket connection
        initSocket();

        // Bind UI events
        bindEvents();

        // Load voice options
        loadVoiceOptions();

        console.log("Voice Translator initialized");
    }

    // Expose playText for inline onclick handlers
    window.VT = {
        playText: playText,
    };

    // Initialize when DOM is ready
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
