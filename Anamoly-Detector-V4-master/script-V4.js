let detectedCoords = [];
let uploadedImage = null;
const DEBUG_MODE = false; // Set to true for coordinate logging during testing

document.addEventListener("DOMContentLoaded", init);

function init() {
    console.log("Script loaded successfully!");
    init_image_select();

    document.getElementById("sensitivity-slider")
        .addEventListener("input", () => detectAnomalies(detectAnomalies.lastColor || 'yellow'));

    initTabs();

    // Close heatmap popup
    const heatmapCloseBtn = document.getElementById("close-heatmap");
    if (heatmapCloseBtn) {
        heatmapCloseBtn.addEventListener("click", () => {
            document.getElementById("heatmap-popup").classList.add("hidden");
        });
    }

    // Close info box
    const infoBoxCloseBtn = document.getElementById("info-box-close");
    if (infoBoxCloseBtn) {
        infoBoxCloseBtn.addEventListener("click", () => {
            document.getElementById("info-box").style.display = 'none';
        });
    }

    // FOV Calc button
    const fovCalcButton = document.getElementById("fov-calc-button");
    if (fovCalcButton) {
        fovCalcButton.addEventListener("click", calculatePixelSize);
    }
}

// IMAGE UPLOAD SETUP
function init_image_select() {
    const image_selector = document.getElementById("image-input");
    const canvas = document.getElementById("canvas");
    const ctx = canvas.getContext('2d');

    if (!image_selector || !canvas || !ctx) {
        console.error("Image upload elements not found!");
        return;
    }

    console.log("Image upload initialized");

    image_selector.addEventListener("change", (event) => {
        const file = event.target.files[0];
        if (!file) {
            console.warn("No file selected");
            return;
        }

        const validTypes = ['image/jpeg', 'image/png', 'image/gif'];
        if (!validTypes.includes(file.type)) {
            alert("Please upload a valid image file (JPEG, PNG, or GIF).");
            image_selector.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = function (e) {
            uploadedImage = new Image();
            uploadedImage.onload = function () {
                try {
                    canvas.width = uploadedImage.width;
                    canvas.height = uploadedImage.height;
                    ctx.drawImage(uploadedImage, 0, 0);
                    console.log("Image loaded successfully:", file.name);
                } catch (err) {
                    console.error("Error rendering image:", err);
                    alert("Failed to render the image. Please try another file.");
                }
            };
            uploadedImage.onerror = function () {
                console.error("Error loading image file");
                alert("Invalid image file. Please try another.");
            };
            uploadedImage.src = e.target.result;
        };
        reader.onerror = function () {
            console.error("Error reading file");
            alert("Error reading file. Please try again.");
        };
        reader.readAsDataURL(file);
    });
}

// TAB INITIALIZATION
let colorWheelInitialized = false;

function initTabs() {
    const tabButtons = document.querySelectorAll('.tab-button');
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            document.querySelectorAll('.tab-content').forEach(content => content.classList.add('hidden'));
            const tabId = button.getAttribute('data-tab');
            document.getElementById(`${tabId}-tab`).classList.remove('hidden');
            if (tabId === 'custom' && !colorWheelInitialized) {
                initColorWheelAndSliders();
                colorWheelInitialized = true;
            }
        });
    });
}

// COLOR WHEEL AND SLIDERS INITIALIZATION
function initColorWheelAndSliders() {
    console.log("Initializing color wheel and sliders...");

    // RGB Elements
    const rgbR = document.getElementById("rgb-r");
    const rgbG = document.getElementById("rgb-g");
    const rgbB = document.getElementById("rgb-b");
    const rgbRValue = document.getElementById("rgb-r-value");
    const rgbGValue = document.getElementById("rgb-g-value");
    const rgbBValue = document.getElementById("rgb-b-value");
    const rgbPreview = document.getElementById("rgb-preview");

    // CMYK Elements
    const cmykC = document.getElementById("cmyk-c");
    const cmykM = document.getElementById("cmyk-m");
    const cmykY = document.getElementById("cmyk-y");
    const cmykK = document.getElementById("cmyk-k");
    const cmykCValue = document.getElementById("cmyk-c-value");
    const cmykMValue = document.getElementById("cmyk-m-value");
    const cmykYValue = document.getElementById("cmyk-y-value");
    const cmykKValue = document.getElementById("cmyk-k-value");
    const cmykPreview = document.getElementById("cmyk-preview");

    if (!rgbR || !rgbG || !rgbB || !cmykC || !cmykM || !cmykY || !cmykK) {
        console.error("One or more slider elements not found!");
        return;
    }

    const colorWheelContainer = document.getElementById("color-wheel-container");
    if (!colorWheelContainer) {
        console.error("Color wheel container (#color-wheel-container) not found!");
        return;
    }

    let colorWheel;
    try {
        colorWheel = new iro.ColorPicker("#color-wheel-container", {
            width: 200,
            color: "rgb(255, 255, 255)", // initial color
            layout: [
                { component: iro.ui.Wheel },
                { component: iro.ui.Slider, options: { sliderType: "value" } }
            ]
        });
        console.log("iro.js color wheel initialized successfully.");
    } catch (e) {
        console.error("Error initializing color wheel:", e);
        return;
    }

    function rgbToCMYK(r, g, b) {
        let c = 1 - (r / 255);
        let m = 1 - (g / 255);
        let y = 1 - (b / 255);
        let k = Math.min(c, m, y);

        c = (c - k) / (1 - k) || 0;
        m = (m - k) / (1 - k) || 0;
        y = (y - k) / (1 - k) || 0;

        return [c, m, y, k];
    }

    function cmykToRgb(c, m, y, k) {
        const r = 255 * (1 - c) * (1 - k);
        const g = 255 * (1 - m) * (1 - k);
        const b = 255 * (1 - y) * (1 - k);
        return [Math.round(r), Math.round(g), Math.round(b)];
    }

    function updateRGBPreview(updateWheel = true) {
        const r = parseInt(rgbR.value);
        const g = parseInt(rgbG.value);
        const b = parseInt(rgbB.value);

        rgbRValue.textContent = r;
        rgbGValue.textContent = g;
        rgbBValue.textContent = b;
        rgbPreview.style.backgroundColor = `rgb(${r}, ${g}, ${b})`;

        const [c, m, y, k] = rgbToCMYK(r, g, b);
        const C = Math.round(c * 100);
        const M = Math.round(m * 100);
        const Y = Math.round(y * 100);
        const K = Math.round(k * 100);
        cmykC.value = C;
        cmykCValue.textContent = `${C}%`;
        cmykM.value = M;
        cmykMValue.textContent = `${M}%`;
        cmykY.value = Y;
        cmykYValue.textContent = `${Y}%`;
        cmykK.value = K;
        cmykKValue.textContent = `${K}%`;

        const [cR, cG, cB] = cmykToRgb(c, m, y, k);
        cmykPreview.style.backgroundColor = `rgb(${cR}, ${cG}, ${cB})`;

        if (updateWheel && colorWheel) {
            colorWheel.color.rgb = { r, g, b };
        }
    }

    function updateCMYKPreview(updateWheel = true) {
        const C = parseInt(cmykC.value, 10);
        const M = parseInt(cmykM.value, 10);
        const Y = parseInt(cmykY.value, 10);
        const K = parseInt(cmykK.value, 10);

        cmykCValue.textContent = `${C}%`;
        cmykMValue.textContent = `${M}%`;
        cmykYValue.textContent = `${Y}%`;
        cmykKValue.textContent = `${K}%`;

        const [r, g, b] = cmykToRgb(C / 100, M / 100, Y / 100, K / 100);
        cmykPreview.style.backgroundColor = `rgb(${r}, ${g}, ${b})`;

        rgbR.value = r;
        rgbG.value = g;
        rgbB.value = b;
        rgbRValue.textContent = r;
        rgbGValue.textContent = g;
        rgbBValue.textContent = b;
        rgbPreview.style.backgroundColor = `rgb(${r}, ${g}, ${b})`;

        if (updateWheel && colorWheel) {
            colorWheel.color.rgb = { r, g, b };
        }
    }

    if (colorWheel) {
        colorWheel.on("color:change", function (color) {
            const { r, g, b } = color.rgb;
            rgbR.value = r;
            rgbG.value = g;
            rgbB.value = b;
            updateRGBPreview(false);
        });
    }

    rgbR.addEventListener("input", () => updateRGBPreview(true));
    rgbG.addEventListener("input", () => updateRGBPreview(true));
    rgbB.addEventListener("input", () => updateRGBPreview(true));
    cmykC.addEventListener("input", () => updateCMYKPreview(true));
    cmykM.addEventListener("input", () => updateCMYKPreview(true));
    cmykY.addEventListener("input", () => updateCMYKPreview(true));
    cmykK.addEventListener("input", () => updateCMYKPreview(true));

    console.log("Performing initial update of RGB preview...");
    updateRGBPreview(true);
}

// DETECT ANOMALIES
function detectAnomalies(color) {
    detectAnomalies.lastColor = color;
    const sensitivity = 100 - parseInt(document.getElementById("sensitivity-slider").value, 10);
    const detectionMode = document.getElementById("detection-mode").value;
    const canvas = document.getElementById("canvas");
    const ctx = canvas.getContext('2d');

    if (!uploadedImage) {
        alert("Please upload an image first!");
        return;
    }

    // Clear main canvas + redraw original
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(uploadedImage, 0, 0);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    detectedCoords = [];
    const coordinatesList = document.getElementById("coordinates-list");
    coordinatesList.innerHTML = '';

    let targetColor;
    if (color === 'custom') {
        if (detectionMode === "cmyk" || detectionMode === "both") {
            const c = parseInt(document.getElementById("cmyk-c").value) / 100;
            const m = parseInt(document.getElementById("cmyk-m").value) / 100;
            const y = parseInt(document.getElementById("cmyk-y").value) / 100;
            const k = parseInt(document.getElementById("cmyk-k").value) / 100;
            targetColor = cmykToRgb(c, m, y, k);
        } else {
            targetColor = [
                parseInt(document.getElementById("rgb-r").value),
                parseInt(document.getElementById("rgb-g").value),
                parseInt(document.getElementById("rgb-b").value)
            ];
        }
    }

    function isAnomalyPixel(r, g, b) {
        if (color === 'yellow') return r > 200 && g > 200 && b < (255 - sensitivity);
        if (color === 'red') return r > g && r > b && r > (255 - sensitivity);
        if (color === 'green') return g > r && g > b && g > (255 - sensitivity);
        if (color === 'blue') return b > r && b > g && b > (255 - sensitivity);
        if (color === 'custom') {
            const isRGB_ = isColorRGB(r, g, b, targetColor, detectionMode === "rgb" || detectionMode === "both");
            const isCMYK_ = isColorCMYK(r, g, b, targetColor, detectionMode === "cmyk" || detectionMode === "both");
            return (detectionMode === "rgb" && isRGB_) 
                || (detectionMode === "cmyk" && isCMYK_) 
                || (detectionMode === "both" && (isRGB_ || isCMYK_));
        }
        return false;
    }

    const visited = new Set();

    function detectCluster(x, y) {
        const stack = [{ x, y }];
        const pixels = [];
        while (stack.length) {
            const { x, y } = stack.pop();
            const index = (y * canvas.width + x) * 4;
            if (visited.has(index)) continue;
            visited.add(index);

            const r = data[index], g = data[index + 1], b = data[index + 2];
            if (isAnomalyPixel(r, g, b)) {
                pixels.push({ x, y });
                if (x > 0) stack.push({ x: x - 1, y });
                if (x < canvas.width - 1) stack.push({ x: x + 1, y });
                if (y > 0) stack.push({ x, y: y - 1 });
                if (y < canvas.height - 1) stack.push({ x, y: y + 1 });
            }
        }
        return pixels;
    }

    for (let y = 0; y < canvas.height; y++) {
        for (let x = 0; x < canvas.width; x++) {
            const index = (y * canvas.width + x) * 4;
            if (visited.has(index)) continue;

            const r = data[index], g = data[index + 1], b = data[index + 2];
            if (isAnomalyPixel(r, g, b)) {
                const cluster = detectCluster(x, y);
                const maxClusterSize = parseInt(document.getElementById("max-cluster-size").value) || 15;
                if (cluster.length > 0 && cluster.length <= maxClusterSize) {
                    const centerX = Math.floor(cluster.reduce((sum, p) => sum + p.x, 0) / cluster.length);
                    const centerY = Math.floor(cluster.reduce((sum, p) => sum + p.y, 0) / cluster.length);
                    detectedCoords.push({ x: centerX, y: centerY, size: cluster.length, r, g, b, cluster });

                    const listItem = document.createElement("li");
                    listItem.classList.add("clickable-coordinate");
                    listItem.innerHTML = `(${centerX}, ${centerY})<br>${cluster.length}px`;
                    listItem.addEventListener("click", () => highlightAnomaly(centerX, centerY, r, g, b, cluster.length, cluster));
                    coordinatesList.appendChild(listItem);

                    // Draw heatmap-style highlight over the cluster
                    ctx.fillStyle = color === 'red' ? 'rgba(0, 0, 255, 0.3)' : 'rgba(255, 0, 0, 0.3)';
                    cluster.forEach(pixel => {
                        ctx.fillRect(pixel.x, pixel.y, 1, 1);
                    });
                }
            }
        }
    }

    renderCoordinatesList(detectedCoords);
    downloadAnomalyPixels(detectedCoords);
}

function highlightAnomaly(x, y, r, g, b, size, cluster) {
    const canvas = document.getElementById("canvas");
    const ctx = canvas.getContext('2d');

    // Redraw original image
    if (uploadedImage) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(uploadedImage, 0, 0);
    }

    // Highlight only the selected anomaly with heatmap style
    ctx.fillStyle = detectAnomalies.lastColor === 'red' ? 'rgba(0, 0, 255, 0.5)' : 'rgba(255, 0, 0, 0.5)';
    cluster.forEach(pixel => {
        ctx.fillRect(pixel.x, pixel.y, 1, 1);
    });

    // Show info box and heatmap (bottom zoomed view)
    showInfoBox(x, y, r, g, b, size);
    showHeatmap(cluster);
}

function showInfoBox(x, y, r, g, b, size) {
    const infoBox = document.getElementById("info-box");
    const infoBoxContent = document.getElementById("info-box-content");
    const backgroundColor = calculateBackgroundColor();
    const colorDifference = calculateColorDifference(r, g, b, backgroundColor);

    infoBoxContent.innerHTML = `
        <strong>Color Difference:</strong> ${colorDifference.toFixed(2)}<br>
        <strong>Anomaly RGB:</strong> (${r}, ${g}, ${b})<br>
        <strong>Background RGB:</strong> (${backgroundColor.r.toFixed(2)}, ${backgroundColor.g.toFixed(2)}, ${backgroundColor.b.toFixed(2)})<br>
        <strong>Size:</strong> ${size} pixels
    `;
    infoBox.style.display = 'block';
}

// HEATMAP (Bottom Zoomed View)
function showHeatmap(cluster) {
    const heatmapCanvas = document.getElementById("heatmap-canvas");
    if (!heatmapCanvas) {
        console.warn("heatmap-canvas not found! Skipping heatmap.");
        return;
    }
    const heatmapCtx = heatmapCanvas.getContext("2d");
    const width = 200, height = 200;
    heatmapCanvas.width = width;
    heatmapCanvas.height = height;
    heatmapCtx.clearRect(0, 0, width, height);

    // Draw the image (zoomed-in view of the anomaly)
    const mainCanvas = document.getElementById("canvas");
    const minX = Math.min(...cluster.map(p => p.x));
    const maxX = Math.max(...cluster.map(p => p.x));
    const minY = Math.min(...cluster.map(p => p.y));
    const maxY = Math.max(...cluster.map(p => p.y));
    const clusterWidth = maxX - minX + 1;
    const clusterHeight = maxY - minY + 1;

    // Add padding around the cluster to show more context
    const padding = 20;
    const paddedMinX = Math.max(0, minX - padding);
    const paddedMinY = Math.max(0, minY - padding);
    const paddedMaxX = Math.min(mainCanvas.width, maxX + padding);
    const paddedMaxY = Math.min(mainCanvas.height, maxY + padding);
    const paddedWidth = paddedMaxX - paddedMinX;
    const paddedHeight = paddedMaxY - paddedMinY;

    // Scale the image to fit the heatmap canvas
    const scaleX = width / paddedWidth;
    const scaleY = height / paddedHeight;
    const scale = Math.min(scaleX, scaleY); // Maintain aspect ratio
    const scaledWidth = paddedWidth * scale;
    const scaledHeight = paddedHeight * scale;

    // Center the image in the heatmap canvas
    const offsetX = (width - scaledWidth) / 2;
    const offsetY = (height - scaledHeight) / 2;

    heatmapCtx.drawImage(
        mainCanvas,
        paddedMinX, paddedMinY, paddedWidth, paddedHeight,
        offsetX, offsetY, scaledWidth, scaledHeight
    );

    document.getElementById("heatmap-popup").classList.remove("hidden");
}

// INFO BOX HELPERS
function calculateBackgroundColor() {
    const canvas = document.getElementById("canvas");
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let totalR = 0, totalG = 0, totalB = 0, count = 0;

    for (let i = 0; i < imageData.length; i += 4) {
        totalR += imageData[i];
        totalG += imageData[i + 1];
        totalB += imageData[i + 2];
        count++;
    }
    return { 
        r: totalR / count, 
        g: totalG / count, 
        b: totalB / count 
    };
}

function calculateColorDifference(r, g, b, backgroundColor) {
    return Math.sqrt(
        Math.pow(r - backgroundColor.r, 2) +
        Math.pow(g - backgroundColor.g, 2) +
        Math.pow(b - backgroundColor.b, 2)
    );
}

// Helper function to check if mouse is near an anomaly
function isNearAnomaly(mouseX, mouseY, coords, threshold = 10) {
    for (let coord of coords) {
        const distance = Math.sqrt(
            Math.pow(mouseX - coord.x, 2) + Math.pow(mouseY - coord.y, 2)
        );
        if (distance <= threshold) {
            return coord; // Return the matching anomaly
        }
    }
    return null; // No anomaly nearby
}

// COORDINATE DISPLAY
function toggleCoordinateDisplay() {
    const showCoordinates = document.getElementById("toggle-coordinates").checked;
    const tooltip = document.getElementById("coordinate-tooltip") || createTooltip();
    const canvas = document.getElementById("canvas");
    const ctx = canvas.getContext('2d');

    canvas.addEventListener("mousemove", (event) => {
        if (!showCoordinates) {
            tooltip.style.display = "none";
            return;
        }

        // Get canvas bounding rectangle and dimensions
        const rect = canvas.getBoundingClientRect();
        const canvasWidth = canvas.width; // Native image width
        const canvasHeight = canvas.height; // Native image height
        const displayWidth = rect.width; // Displayed canvas width
        const displayHeight = rect.height; // Displayed canvas height

        // Calculate scaling factors
        const scaleX = canvasWidth / displayWidth;
        const scaleY = canvasHeight / displayHeight;

        // Map mouse coordinates to image pixel coordinates
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;
        const pixelX = Math.floor(mouseX * scaleX);
        const pixelY = Math.floor(mouseY * scaleY);

        // Clamp coordinates to image bounds
        const x = Math.max(0, Math.min(pixelX, canvasWidth - 1));
        const y = Math.max(0, Math.min(pixelY, canvasHeight - 1));

        // Debug logging
        if (DEBUG_MODE) {
            console.log(`Mouse: (${mouseX.toFixed(2)}, ${mouseY.toFixed(2)}) -> Pixel: (${x}, ${y})`);
        }

        // Get RGB value of the pixel
        let rgbText = "";
        if (ctx && uploadedImage) {
            try {
                const pixelData = ctx.getImageData(x, y, 1, 1).data;
                const [r, g, b] = [pixelData[0], pixelData[1], pixelData[2]];
                rgbText = ` RGB: (${r}, ${g}, ${b})`;
            } catch (e) {
                console.warn("Error getting pixel data:", e);
            }
        }

        // Check if mouse is near an anomaly (using native pixel coordinates)
        const nearbyAnomaly = isNearAnomaly(x, y, detectedCoords);

        tooltip.style.display = "block";
        tooltip.style.left = `${event.pageX + 15}px`;
        tooltip.style.top = `${event.pageY + 15}px`;

        if (nearbyAnomaly) {
            // Show exact anomaly coordinates and highlight tooltip
            tooltip.textContent = `(${nearbyAnomaly.x}, ${nearbyAnomaly.y})`;
            tooltip.classList.add("near-anomaly");
        } else {
            // Show mapped pixel coordinates and RGB value
            tooltip.textContent = `(${x}, ${y})${rgbText}`;
            tooltip.classList.remove("near-anomaly");
        }
    });

    canvas.addEventListener("mouseleave", () => {
        tooltip.style.display = "none";
        tooltip.classList.remove("near-anomaly");
    });
}

function createTooltip() {
    const tooltip = document.createElement("div");
    tooltip.id = "coordinate-tooltip";
    document.body.appendChild(tooltip);
    tooltip.style.position = "absolute";
    tooltip.style.background = "rgba(0, 0, 0, 0.7)";
    tooltip.style.color = "#fff";
    tooltip.style.padding = "5px 8px";
    tooltip.style.borderRadius = "4px";
    tooltip.style.fontSize = "12px";
    tooltip.style.pointerEvents = "none";
    tooltip.style.display = "none";
    tooltip.style.zIndex = "1000"; // Ensure tooltip is above other elements
    return tooltip;
}

// SORT COORDINATES
function sortCoordinates() {
    const sortOption = document.getElementById("sort-options").value;
    let sortedCoords = [...detectedCoords];

    if (sortOption === "size-asc") sortedCoords.sort((a, b) => a.size - b.size);
    else if (sortOption === "size-desc") sortedCoords.sort((a, b) => b.size - b.size);
    else if (sortOption === "left-to-right") sortedCoords.sort((a, b) => a.x - b.x);
    else if (sortOption === "top-to-bottom") sortedCoords.sort((a, b) => a.y - b.y);

    renderCoordinatesList(sortedCoords);
}

// RENDER COORDINATES
function renderCoordinatesList(coords) {
    const coordinatesList = document.getElementById("coordinates-list");
    coordinatesList.innerHTML = '';

    coords.forEach(({ x, y, size, r, g, b, cluster }) => {
        const listItem = document.createElement("li");
        listItem.classList.add("clickable-coordinate");
        listItem.innerHTML = `(${x}, ${y})<br>${size}px`;
        listItem.addEventListener("click", () => highlightAnomaly(x, y, r, g, b, size, cluster));
        coordinatesList.appendChild(listItem);
    });
}

// COLOR DETECTION HELPERS
function isColorRGB(r, g, b, target, useRGB) {
    if (!useRGB) return false;
    const [tr, tg, tb] = target;
    const sensitivity = 100 - parseInt(document.getElementById("sensitivity-slider").value, 10);
    return Math.abs(r - tr) < (75 - sensitivity / 2) &&
           Math.abs(g - tg) < (75 - sensitivity / 2) &&
           Math.abs(b - tb) < (75 - sensitivity / 2);
}

function isColorCMYK(r, g, b, target, useCMYK) {
    if (!useCMYK) return false;

    // Convert the pixel (r,g,b) to cmyk
    let c = 1 - (r / 255),
        m = 1 - (g / 255),
        y = 1 - (b / 255);
    let k = Math.min(c, m, y);
    c = (c - k) / (1 - k) || 0;
    m = (m - k) / (1 - k) || 0;
    y = (y - k) / (1 - k) || 0;

    // 'target' is the cmyk version of the user-chosen color
    const [tc, tm, ty] = rgbToCMYK(...target);
    const sensitivity = 100 - parseInt(document.getElementById("sensitivity-slider").value, 10);
    return Math.abs(c - tc) < (0.2 - sensitivity / 500) &&
           Math.abs(m - tm) < (0.2 - sensitivity / 500) &&
           Math.abs(y - ty) < (0.2 - sensitivity / 500);
}

function cmykToRgb(c, m, y, k) {
    const r = 255 * (1 - c) * (1 - k);
    const g = 255 * (1 - m) * (1 - k);
    const b = 255 * (1 - y) * (1 - k);
    return [Math.round(r), Math.round(g), Math.round(b)];
}

function rgbToCMYK(r, g, b) {
    let c = 1 - (r / 255),
        m = 1 - (g / 255),
        y = 1 - (b / 255);
    let k = Math.min(c, m, y);
    c = (c - k) / (1 - k) || 0;
    m = (m - k) / (1 - k) || 0;
    y = (y - k) / (1 - k) || 0;
    return [c, m, y, k];
}

// DOWNLOAD ANOMALY PIXELS
function downloadAnomalyPixels(coords) {
    const text = coords.map(p => `${p.x}, ${p.y}`).join("\n");
    const blob = new Blob([text], { type: "text/plain" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "anomaly_pixels.txt";
    link.textContent = "Download Anomaly Coordinates";
    link.style.color = "#87CEFA";
    link.style.display = "block";
    link.style.marginTop = "10px";
    const coordinatesOutput = document.getElementById("coordinates-output");
    const existingLink = coordinatesOutput.querySelector("a");
    if (existingLink) existingLink.remove();
    coordinatesOutput.appendChild(link);
}

// FOV CALCULATION
function calculatePixelSize(event) {
    event.preventDefault();
    const horizFovInput = document.getElementById("horiz-fov");
    const distanceInput = document.getElementById("fov-distance");
    const pixelSizeOutput = document.getElementById("pixel-size-output");

    const horizFovDeg = parseFloat(horizFovInput.value) || 0;
    const distance = parseFloat(distanceInput.value) || 0;
    const horizFovRad = horizFovDeg * Math.PI / 180;

    const canvas = document.getElementById("canvas");
    const imageWidthInPixels = canvas?.width || 1;

    const pixelSize = (2 * Math.tan(horizFovRad / 2) * distance) / imageWidthInPixels;
    pixelSizeOutput.textContent = pixelSize.toFixed(4);
}
