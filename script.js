document.addEventListener("DOMContentLoaded", () => {
    // DOM Elements
    const streamCountInput = document.getElementById("stream-count");
    const applyStreamCountButton = document.getElementById("apply-stream-count");
    const muteAllButton = document.getElementById("mute-all");
    const toggleViewButton = document.getElementById("toggle-view");
    const screenshotBtn = document.getElementById("screenshot-btn");
    const historyList = document.getElementById("history-list");

    const videoGrid = document.getElementById("video-grid");
    const mainSubViewArea = document.getElementById("main-sub-view-area");
    const mainVideoPlayerContainer = document.getElementById("main-video-player-container");
    const subVideoPlayersContainer = document.getElementById("sub-video-players-container");

    // State variables
    let hlsInstances = [];
    let streamURLs = [];
    let playerElements = [];
    let individualMuteStates = [];
    const MAX_HISTORY_ITEMS = 20;
    let history = JSON.parse(localStorage.getItem("m3u8History")) || [];

    let isMainSubViewActive = false;
    let mainPlayerIndex = -1;
    let isGlobalMuted = false;

    // Preset streams
    const presetStreams = [
        { name: "适应性训练1080", url: "https://rtmp.djicdn.com/robomaster/Main-live-view-input-master.m3u8?auth_key=1753023390-0-0-712e1fec3a708fb1452ea872fa88bcc2" },
        { name: "适应性训练720", url: "https://rtmp.djicdn.com/robomaster/Main-live-view-input-master_ud.m3u8?auth_key=1753023390-0-0-760633087fd7be4e7ad149ef04a8ff8f" },
        { name: "适应性训练540", url: "https://rtmp.djicdn.com/robomaster/Main-live-view-input-master_hd.m3u8?auth_key=1753023390-0-0-6476d42d0b0e52e502401b66b60bbf6c" },
        { name: "红方英雄", url: "https://rtmp.djicdn.com/robomaster/Red-1-hero.m3u8?auth_key=1745314002-0-0-ede1a608ce5704b75fd633f74aff1c58" },
        { name: "蓝方英雄", url: "https://rtmp.djicdn.com/robomaster/Blue-1-hero.m3u8?auth_key=1745314060-0-0-de3fbefd16380ba14d6a51a6b8ccdfb9" },
        { name: "红方工程", url: "https://rtmp.djicdn.com/robomaster/Red-Square-Project-2.m3u8?auth_key=1745314131-0-0-dc5fd21813d956472744bc8d16ed1cf6" },
        { name: "蓝方工程", url: "https://rtmp.djicdn.com/robomaster/Blue-Square-Project-2.m3u8?auth_key=1745314197-0-0-334774b950de79bd69eb16c43afac84a" },
        { name: "红方3号步兵", url: "https://rtmp.djicdn.com/robomaster/Red-Infantry-3.m3u8?auth_key=1745314266-0-0-ec85cf48692a950241d88aa150124c5f" },
        { name: "蓝方3号步兵", url: "https://rtmp.djicdn.com/robomaster/Blue-Infantry-3.m3u8?auth_key=1745314347-0-0-c39c04f3adec66bf2594aa8feeb0ddfa" },
        { name: "红方4号步兵", url: "https://rtmp.djicdn.com/robomaster/Red-Infantry-4.m3u8?auth_key=1745314417-0-0-c241e3f88b303fbdc88580e16420669e" },
        { name: "蓝方4号步兵", url: "https://rtmp.djicdn.com/robomaster/Blue-Infantry-4.m3u8?auth_key=1745314655-0-0-99901ad846a88d7ce1bdddad206230a5" },
        { name: "红方无人机", url: "https://rtmp.djicdn.com/robomaster/Red-Drone-6.m3u8?auth_key=1745314728-0-0-f75a1472ea3174a6ebe27530b38241e3" },
        { name: "蓝方无人机", url: "https://rtmp.djicdn.com/robomaster/Blue-Drone-6.m3u8?auth_key=1745314803-0-0-438b288abbe9e9f5406fb6f628643aa0" },
        { name: "红方全画面", url: "https://rtmp.djicdn.com/robomaster/Red-full-screen.m3u8?auth_key=1745314871-0-0-4de13fa8ef4070ba77dddded08401cec" },
        { name: "蓝方全画面", url: "https://rtmp.djicdn.com/robomaster/Blue-full-screen.m3u8?auth_key=1745314948-0-0-129efd00e715fb161493b5a87e592b1d" },
        { name: "2号机", url: "https://rtmp.djicdn.com/robomaster/Unit-02.m3u8?auth_key=1745315602-0-0-d8c1278e8ff7ba5a00af963c52cca6a3" },
        { name: "3号机", url: "https://rtmp.djicdn.com/robomaster/Unit-03.m3u8?auth_key=1745315844-0-0-fba7a05c12cce0d979782312916025f2" },
        { name: "主视角", url: "https://rtmp.djicdn.com/robomaster/Mainperspective-output.m3u8?auth_key=1747039569-0-0-aa025930664b369a36bcb35e49cad68e" }
    ];

    // Utility functions
    function showError(element, message) {
        // Remove any existing error message
        const existingError = element.querySelector('.error-message');
        if (existingError) existingError.remove();

        const errorElement = document.createElement('div');
        errorElement.className = 'error-message';
        errorElement.textContent = message;
        element.appendChild(errorElement);

        // Remove error after 5 seconds
        setTimeout(() => {
            if (errorElement.parentNode === element) {
                element.removeChild(errorElement);
            }
        }, 5000);
    }

    function showLoading(element) {
        const loadingElement = document.createElement('div');
        loadingElement.className = 'loading-spinner';
        element.appendChild(loadingElement);
        return loadingElement;
    }

    function hideLoading(loadingElement) {
        if (loadingElement && loadingElement.parentNode) {
            loadingElement.parentNode.removeChild(loadingElement);
        }
    }

    // Core functions
    function updateGridLayout(count) {
        videoGrid.className = `view-area grid-${count}`;
        if (isMainSubViewActive) videoGrid.classList.add("hidden");
    }

    function saveHistory() {
        localStorage.setItem("m3u8History", JSON.stringify(history));
    }

    function addToHistory(url) {
        if (url && !history.includes(url) && !presetStreams.some(preset => preset.url === url)) {
            history.unshift(url);
            if (history.length > MAX_HISTORY_ITEMS) history.pop();
            saveHistory();
            renderHistory();
        }
    }

    function renderHistory() {
        historyList.innerHTML = "";
        if (history.length === 0) {
            const li = document.createElement("li");
            li.textContent = "没有历史记录";
            historyList.appendChild(li);
            return;
        }

        history.forEach(url => {
            const li = document.createElement("li");
            li.textContent = url;
            li.title = `点击加载: ${url}`;
            li.addEventListener("click", () => loadUrlFromHistory(url));
            historyList.appendChild(li);
        });
    }

    function loadUrlFromHistory(url) {
        let targetPlayerIndex = -1;

        // Try to find an empty player in main view first
        if (isMainSubViewActive && mainPlayerIndex !== -1) {
            const mainInputElement = playerElements[mainPlayerIndex]?.querySelector(".player-controls input[type=\"text\"]");
            if (mainInputElement && !mainInputElement.value) {
                targetPlayerIndex = mainPlayerIndex;
            }
        }

        // Then try to find any empty player
        if (targetPlayerIndex === -1) {
            for (let i = 0; i < playerElements.length; i++) {
                const inputElement = playerElements[i]?.querySelector(".player-controls input[type=\"text\"]");
                if (inputElement && !inputElement.value) {
                    targetPlayerIndex = i;
                    break;
                }
            }
        }

        // If all players have content, use the first one
        if (targetPlayerIndex === -1 && playerElements.length > 0) {
            targetPlayerIndex = 0;
        }

        if (targetPlayerIndex !== -1 && playerElements[targetPlayerIndex]) {
            const inputElement = playerElements[targetPlayerIndex].querySelector(".player-controls input[type=\"text\"]");
            const loadButton = playerElements[targetPlayerIndex].querySelector(".player-controls button.load-btn");

            if (inputElement && loadButton) {
                inputElement.value = url;
                loadButton.click();

                if (isMainSubViewActive && targetPlayerIndex !== mainPlayerIndex) {
                    setMainPlayer(targetPlayerIndex);
                }
            }
        } else if (playerElements.length > 0) {
            const firstInput = playerElements[0].querySelector(".player-controls input[type=\"text\"]");
            const firstLoadBtn = playerElements[0].querySelector(".player-controls button.load-btn");

            if (firstInput && firstLoadBtn) {
                firstInput.value = url;
                firstLoadBtn.click();

                if (isMainSubViewActive) {
                    setMainPlayer(0);
                }
            }
        }
    }

    function stopStream(index) {
        if (hlsInstances[index]) {
            hlsInstances[index].destroy();
            hlsInstances[index] = null;
        }

        const videoElement = playerElements[index]?.querySelector("video");
        if (videoElement) {
            videoElement.src = "";
            videoElement.removeAttribute("src");
            videoElement.load();
        }

        streamURLs[index] = "";
        const urlInput = playerElements[index]?.querySelector(".player-controls input[type=\"text\"]");
        if (urlInput) urlInput.value = "";

        const presetSelect = playerElements[index]?.querySelector(".player-controls select");
        if (presetSelect) presetSelect.selectedIndex = 0;

        // Remove any loading spinner or error message
        const playerContainer = playerElements[index];
        if (playerContainer) {
            hideLoading(playerContainer.querySelector('.loading-spinner'));
            const errorElement = playerContainer.querySelector('.error-message');
            if (errorElement) errorElement.remove();
        }
    }

    function takeScreenshot() {
        if (playerElements.length === 0) return;

        const activePlayerIndex = isMainSubViewActive ? mainPlayerIndex : 0;
        const videoElement = playerElements[activePlayerIndex]?.querySelector("video");

        if (!videoElement || videoElement.readyState < 2) {
            alert("视频未准备好，无法截图");
            return;
        }

        const canvas = document.createElement('canvas');
        canvas.width = videoElement.videoWidth;
        canvas.height = videoElement.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

        const link = document.createElement('a');
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        link.download = `screenshot-${timestamp}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    }

    function createVideoPlayer(index) {
        const playerContainer = document.createElement("div");
        playerContainer.className = "video-player-container";
        playerContainer.dataset.index = index;

        const videoElement = document.createElement("video");
        videoElement.id = `video-${index}`;
        videoElement.muted = individualMuteStates[index] === undefined ? true : individualMuteStates[index];
        videoElement.setAttribute("playsinline", "");
        videoElement.setAttribute("webkit-playsinline", "");
        videoElement.setAttribute("autoplay", "");

        const controlsDiv = document.createElement("div");
        controlsDiv.className = "player-controls";

        const urlInput = document.createElement("input");
        urlInput.type = "text";
        urlInput.placeholder = "输入 M3U8 URL 或选择预设";
        urlInput.id = `url-input-${index}`;
        if (streamURLs[index]) urlInput.value = streamURLs[index];

        const presetSelect = document.createElement("select");
        presetSelect.id = `preset-select-${index}`;
        const defaultOption = document.createElement("option");
        defaultOption.value = "";
        defaultOption.textContent = "选择预设源...";
        presetSelect.appendChild(defaultOption);

        presetStreams.forEach(preset => {
            const option = document.createElement("option");
            option.value = preset.url;
            option.textContent = preset.name;
            presetSelect.appendChild(option);
        });

        presetSelect.addEventListener("change", () => {
            if (presetSelect.value) {
                urlInput.value = presetSelect.value;
                const loadButton = controlsDiv.querySelector(".load-btn");
                if (loadButton) {
                    individualMuteStates[index] = true;
                    loadButton.click();

                    const singleMuteBtn = controlsDiv.querySelector(".mute-single-btn");
                    if (singleMuteBtn) {
                        singleMuteBtn.textContent = "取消静音";
                    }
                }
            }
        });

        const loadButton = document.createElement("button");
        loadButton.textContent = "加载";
        loadButton.className = "load-btn";
        loadButton.addEventListener("click", () => {
            const url = urlInput.value.trim();
            if (url) {
                const loadingElement = showLoading(playerContainer);

                streamURLs[index] = url;
                loadStream(videoElement, url, index, () => {
                    hideLoading(loadingElement);
                });

                if (!presetStreams.some(preset => preset.url === url)) {
                    addToHistory(url);
                }
            } else {
                showError(playerContainer, "请输入有效的 M3U8 URL");
            }
        });

        const stopButton = document.createElement("button");
        stopButton.textContent = "停止";
        stopButton.className = "stop-btn";
        stopButton.addEventListener("click", () => {
            stopStream(index);
        });

        const downloadButton = document.createElement("button");
        downloadButton.textContent = "下载M3U8";
        downloadButton.addEventListener("click", () => {
            const url = urlInput.value.trim();
            if (url) {
                fetch(url)
                    .then(response => {
                        if (!response.ok) throw new Error("网络响应不正常");
                        return response.text();
                    })
                    .then(data => {
                        const blob = new Blob([data], { type: "application/vnd.apple.mpegurl" });
                        const a = document.createElement("a");
                        a.href = URL.createObjectURL(blob);
                        const filename = url.substring(url.lastIndexOf("/") + 1) || "stream.m3u8";
                        a.download = filename;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        setTimeout(() => URL.revokeObjectURL(a.href), 100);
                    })
                    .catch(err => {
                        console.error("下载 M3U8 文件失败:", err);
                        showError(playerContainer, "下载 M3U8 文件失败");
                    });
            } else {
                showError(playerContainer, "请输入有效的 M3U8 URL");
            }
        });

        const singleMuteButton = document.createElement("button");
        singleMuteButton.className = "mute-single-btn";
        singleMuteButton.textContent = videoElement.muted ? "取消静音" : "静音";
        singleMuteButton.addEventListener("click", () => {
            if (!isGlobalMuted) {
                individualMuteStates[index] = !individualMuteStates[index];
                videoElement.muted = individualMuteStates[index];
                singleMuteButton.textContent = videoElement.muted ? "取消静音" : "静音";
            }
        });

        const fullscreenButton = document.createElement("button");
        fullscreenButton.textContent = "全屏";
        fullscreenButton.addEventListener("click", () => {
            toggleFullscreen(playerContainer, fullscreenButton);
        });

        // Add all controls to the controls div
        controlsDiv.appendChild(presetSelect);
        controlsDiv.appendChild(urlInput);
        controlsDiv.appendChild(loadButton);
        controlsDiv.appendChild(stopButton);
        controlsDiv.appendChild(downloadButton);
        controlsDiv.appendChild(singleMuteButton);
        controlsDiv.appendChild(fullscreenButton);

        // Create stream name label
        const streamNameLabel = document.createElement("div");
        streamNameLabel.className = "stream-name-label";
        streamNameLabel.textContent = "";
        playerContainer.appendChild(streamNameLabel);

        // Add video and controls to player container
        playerContainer.appendChild(videoElement);
        playerContainer.appendChild(controlsDiv);

        // Add click handler for main/sub view switching
        playerContainer.addEventListener("click", (e) => {
            if (isMainSubViewActive && playerContainer.parentElement === subVideoPlayersContainer) {
                if (!controlsDiv.contains(e.target)) {
                    if (e.target === videoElement || e.target === playerContainer || videoElement.contains(e.target)) {
                        e.preventDefault();
                    }
                    setMainPlayer(index);
                }
            }
        });

        return playerContainer;
    }

    function toggleFullscreen(container, button) {
        if (!document.fullscreenElement && !document.webkitFullscreenElement && !document.msFullscreenElement) {
            // Enter fullscreen
            const requestFullscreen = container.requestFullscreen ||
                container.webkitRequestFullscreen ||
                container.msRequestFullscreen;

            if (requestFullscreen) {
                requestFullscreen.call(container).catch(err => {
                    console.error("全屏错误:", err);
                    showError(container, "无法进入全屏模式");
                });
                button.textContent = "取消全屏";
            }
        } else {
            // Exit fullscreen
            const exitFullscreen = document.exitFullscreen ||
                document.webkitExitFullscreen ||
                document.msExitFullscreen;

            if (exitFullscreen) {
                exitFullscreen.call(document).catch(err => {
                    console.error("退出全屏错误:", err);
                });
                button.textContent = "全屏";
            }
        }
    }

    function loadStream(videoElement, url, index, onComplete) {
        // Clear any existing HLS instance
        if (hlsInstances[index]) {
            hlsInstances[index].destroy();
        }

        const preset = presetStreams.find(p => p.url === url);
        const nameToShow = preset ? preset.name : url;

        // Update stream name label
        const nameLabel = playerElements[index]?.querySelector(".stream-name-label");
        if (nameLabel) {
            nameLabel.textContent = nameToShow;
        }

        // Create new HLS instance and load stream
        if (Hls.isSupported()) {
            const hls = new Hls({
                maxBufferLength: 30,
                maxMaxBufferLength: 600,
                maxBufferSize: 60 * 1000 * 1000,
                maxBufferHole: 0.5,
                lowLatencyMode: false,
                enableWorker: true,
                startLevel: -1,
                abrEwmaDefaultEstimate: 500000,
                abrBandWidthFactor: 0.95,
                abrBandWidthUpFactor: 0.7,
                abrMaxWithRealBitrate: true
            });

            hlsInstances[index] = hls;

            hls.loadSource(url);
            hls.attachMedia(videoElement);

            hls.on(Hls.Events.MANIFEST_PARSED, () => {
                videoElement.play().catch(e => {
                    console.warn(`播放器 ${index + 1} 自动播放失败:`, e);
                    showError(playerElements[index], "自动播放失败，请点击播放");
                });
                if (onComplete) onComplete();
            });

            hls.on(Hls.Events.ERROR, (event, data) => {
                console.error(`HLS.js error on player ${index}:`, data.type, data.details, data.fatal);

                if (data.fatal) {
                    switch (data.type) {
                        case Hls.ErrorTypes.NETWORK_ERROR:
                            showError(playerElements[index], "网络错误，尝试重新加载...");
                            hls.startLoad();
                            break;
                        case Hls.ErrorTypes.MEDIA_ERROR:
                            showError(playerElements[index], "媒体错误，尝试恢复...");
                            hls.recoverMediaError();
                            break;
                        default:
                            showError(playerElements[index], "致命错误，无法恢复");
                            hls.destroy();
                            hlsInstances[index] = null;
                            break;
                    }
                }

                if (onComplete) onComplete();
            });
        } else if (videoElement.canPlayType("application/vnd.apple.mpegurl")) {
            // Native HLS support
            videoElement.src = url;
            videoElement.addEventListener("loadedmetadata", () => {
                videoElement.play().catch(e => {
                    console.warn(`播放器 ${index + 1} 自动播放失败:`, e);
                    showError(playerElements[index], "自动播放失败，请点击播放");
                });
                if (onComplete) onComplete();
            });

            videoElement.addEventListener("error", () => {
                showError(playerElements[index], "视频加载错误");
                if (onComplete) onComplete();
            });
        } else {
            showError(playerElements[index], "您的浏览器不支持 HLS 播放");
            if (onComplete) onComplete();
        }

        // Apply mute state
        const currentMuteState = isGlobalMuted ? true : (individualMuteStates[index] === undefined ? true : individualMuteStates[index]);
        videoElement.muted = currentMuteState;

        // Update mute button
        const singleMuteButton = playerElements[index]?.querySelector(".mute-single-btn");
        if (singleMuteButton) {
            singleMuteButton.textContent = videoElement.muted ? "取消静音" : "静音";
            singleMuteButton.disabled = isGlobalMuted;
        }
    }

    function setupAllPlayers(newCount) {
        // Save current state
        const oldPlayerCount = playerElements.length;
        const oldStreamURLs = [...streamURLs];
        const oldIndividualMuteStates = [...individualMuteStates];
        const oldHlsInstances = [...hlsInstances];

        // Remove all existing players
        playerElements.forEach(p => {
            if (p && p.parentNode) {
                p.parentNode.removeChild(p);
            }
        });

        // Initialize new arrays
        hlsInstances = new Array(newCount).fill(null);
        playerElements = new Array(newCount).fill(null);
        streamURLs = new Array(newCount).fill("");
        individualMuteStates = new Array(newCount).fill(false);

        // Recreate players
        for (let i = 0; i < newCount; i++) {
            // Restore state from old players if available
            if (i < oldPlayerCount) {
                streamURLs[i] = oldStreamURLs[i] || "";
                individualMuteStates[i] = oldIndividualMuteStates[i] === undefined ? false : oldIndividualMuteStates[i];
                hlsInstances[i] = oldHlsInstances[i];
            } else {
                streamURLs[i] = "";
                individualMuteStates[i] = false;
            }

            playerElements[i] = createVideoPlayer(i);

            if (streamURLs[i]) {
                const videoElement = playerElements[i].querySelector("video");
                loadStream(videoElement, streamURLs[i], i);
            } else if (hlsInstances[i]) {
                hlsInstances[i].destroy();
                hlsInstances[i] = null;
            }
        }

        // Destroy any remaining old HLS instances
        for (let i = newCount; i < oldPlayerCount; i++) {
            if (oldHlsInstances[i]) {
                oldHlsInstances[i].destroy();
            }
        }

        // Adjust main player index if needed
        if (mainPlayerIndex >= newCount) {
            mainPlayerIndex = newCount > 0 ? newCount - 1 : -1;
        }

        if (newCount > 0 && mainPlayerIndex === -1) {
            mainPlayerIndex = 0;
        }

        renderCurrentView();
    }

    function renderCurrentView() {
        // Clear containers
        videoGrid.innerHTML = "";
        mainVideoPlayerContainer.innerHTML = "";
        subVideoPlayersContainer.innerHTML = "";

        if (isMainSubViewActive) {
            // Main/Sub view mode
            mainSubViewArea.classList.remove("hidden");
            videoGrid.classList.add("hidden");
            toggleViewButton.textContent = "退出主副视图";

            if (playerElements.length === 0) return;
            if (mainPlayerIndex === -1 && playerElements.length > 0) mainPlayerIndex = 0;

            // Add players to appropriate containers
            playerElements.forEach((player, i) => {
                if (!player) return;

                player.classList.remove("is-sub-player");

                if (i === mainPlayerIndex) {
                    mainVideoPlayerContainer.appendChild(player);
                } else {
                    player.classList.add("is-sub-player");
                    subVideoPlayersContainer.appendChild(player);
                }
            });
        } else {
            // Grid view mode
            mainSubViewArea.classList.add("hidden");
            videoGrid.classList.remove("hidden");
            toggleViewButton.textContent = "切换主副视图";

            updateGridLayout(playerElements.length);

            // Add all players to grid
            playerElements.forEach(player => {
                if (!player) return;
                player.classList.remove("is-sub-player");
                videoGrid.appendChild(player);
            });
        }

        // Apply mute states
        applyMuteStatesOnViewChange();
    }

    function applyMuteStatesOnViewChange() {
        playerElements.forEach((playerContainer, idx) => {
            if (!playerContainer) return;

            const video = playerContainer.querySelector("video");
            const singleMuteBtn = playerContainer.querySelector(".mute-single-btn");

            if (video && singleMuteBtn) {
                video.muted = individualMuteStates[idx] === undefined ? false : individualMuteStates[idx];
                singleMuteBtn.textContent = video.muted ? "取消静音" : "静音";
                singleMuteBtn.disabled = isGlobalMuted;
            }
        });

        muteAllButton.textContent = isGlobalMuted ? "取消全部静音" : "一键静音";
    }

    function applyGlobalMuteOverride() {
        playerElements.forEach((playerContainer, idx) => {
            if (!playerContainer) return;

            const video = playerContainer.querySelector("video");
            const singleMuteBtn = playerContainer.querySelector(".mute-single-btn");

            if (video && singleMuteBtn) {
                if (isGlobalMuted) {
                    video.muted = true;
                } else {
                    video.muted = individualMuteStates[idx] === undefined ? false : individualMuteStates[idx];
                }

                singleMuteBtn.textContent = video.muted ? "取消静音" : "静音";
                singleMuteBtn.disabled = isGlobalMuted;
            }
        });

        muteAllButton.textContent = isGlobalMuted ? "取消全部静音" : "一键静音";
    }

    function setMainPlayer(indexToMakeMain) {
        if (indexToMakeMain >= 0 && indexToMakeMain < playerElements.length) {
            mainPlayerIndex = indexToMakeMain;
            renderCurrentView();
        }
    }

    // Event listeners
    applyStreamCountButton.addEventListener("click", () => {
        const count = parseInt(streamCountInput.value, 10);
        if (count >= 1 && count <= 9) {
            setupAllPlayers(count);
        } else {
            alert("请输入1到9之间的数字。");
        }
    });

    muteAllButton.addEventListener("click", () => {
        isGlobalMuted = !isGlobalMuted;
        applyGlobalMuteOverride();
    });

    toggleViewButton.addEventListener("click", () => {
        isMainSubViewActive = !isMainSubViewActive;

        if (playerElements.length === 0 && isMainSubViewActive) {
            alert("请先添加至少一个视频流以使用主副视图功能。");
            isMainSubViewActive = false;
            renderCurrentView();
            return;
        }

        renderCurrentView();
    });

    screenshotBtn.addEventListener("click", takeScreenshot);

    // Keyboard shortcuts
    document.addEventListener("keydown", (e) => {
        // Mute/unmute all with 'm' key
        if (e.key === 'm' || e.key === 'M') {
            e.preventDefault();
            muteAllButton.click();
        }

        // Take screenshot with 's' key
        if (e.key === 's' || e.key === 'S') {
            e.preventDefault();
            takeScreenshot();
        }
    });

    // Initialize
    const initialStreamCount = parseInt(streamCountInput.value, 10);
    streamCountInput.max = "9";
    setupAllPlayers(initialStreamCount > 9 ? 9 : initialStreamCount < 1 ? 1 : initialStreamCount);
    renderHistory();
    isMainSubViewActive = false;
    renderCurrentView();
});