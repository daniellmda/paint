class PaintApp {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext("2d");
        this.drawing = false;
        this.brushColor = "#000000";
        this.brushSize = 5;
        this.history = [];
        this.isEraser = false;
        this.isFillTool = false;
        
        this.canvas.width = 800;
        this.canvas.height = 600;

        // Inițializare cu pensula activă
        document.getElementById('brushButton').classList.add('active');

        this.setupEventListeners();
        this.saveHistory();
    }

    setColor(color) {
        this.brushColor = color;
        this.isEraser = false;
    }

    setSize(size) {
        this.brushSize = size;
    }

    activateEraser() {
        this.isEraser = true;
        this.isFillTool = false;
        // Actualizare UI
        document.getElementById('brushButton').classList.remove('active');
        document.getElementById('fillButton').classList.remove('active');
        document.getElementById('eraserButton').classList.add('active');
    }

    activateFillTool() {
        this.isFillTool = true;
        this.isEraser = false;
        // Actualizare UI
        document.getElementById('brushButton').classList.remove('active');
        document.getElementById('fillButton').classList.add('active');
        document.getElementById('eraserButton').classList.remove('active');
    }

    activateBrush() {
        this.isFillTool = false;
        this.isEraser = false;
        // Actualizare UI
        document.getElementById('brushButton').classList.add('active');
        document.getElementById('fillButton').classList.remove('active');
        document.getElementById('eraserButton').classList.remove('active');
    }

    setupEventListeners() {
        this.canvas.addEventListener("mousedown", (event) => {
            if (this.isFillTool) {
                const { x, y } = this.getCoordinates(event);
                this.floodFill(Math.round(x), Math.round(y), this.brushColor);
            } else {
                this.startDrawing(event);
            }
        });
        this.canvas.addEventListener("mousemove", (event) => this.draw(event));
        this.canvas.addEventListener("mouseup", () => this.stopDrawing());
        this.canvas.addEventListener("mouseleave", () => this.stopDrawing());

        document.getElementById("clearButton").addEventListener("click", () => this.clearCanvas());
        document.getElementById("saveButton").addEventListener("click", () => this.saveImage());
        document.getElementById("newImageButton").addEventListener("click", () => this.newImage());
        document.getElementById("loadImageButton").addEventListener("click", () => this.loadImage());
        document.getElementById("imageLoader").addEventListener("change", (event) => this.handleImageUpload(event));
        document.getElementById("eraserButton").addEventListener("click", () => this.activateEraser());
        document.getElementById("fillButton").addEventListener("click", () => this.activateFillTool());
        document.getElementById("brushButton").addEventListener("click", () => this.activateBrush());

        // Listener pentru culoarea de fundal
        document.getElementById("backgroundColorPicker").addEventListener("input", (event) => {
            this.canvas.style.backgroundColor = event.target.value;
        });
    }

    getPixel(imageData, x, y) {
        if (x < 0 || y < 0 || x >= imageData.width || y >= imageData.height) {
            return [-1, -1, -1, -1];
        }
        const index = (y * imageData.width + x) * 4;
        return [
            imageData.data[index],
            imageData.data[index + 1],
            imageData.data[index + 2],
            imageData.data[index + 3]
        ];
    }

    setPixel(imageData, x, y, color) {
        const index = (y * imageData.width + x) * 4;
        imageData.data[index] = color[0];
        imageData.data[index + 1] = color[1];
        imageData.data[index + 2] = color[2];
        imageData.data[index + 3] = color[3];
    }

    colorsMatch(a, b, tolerance = 0) {
        return Math.abs(a[0] - b[0]) <= tolerance &&
               Math.abs(a[1] - b[1]) <= tolerance &&
               Math.abs(a[2] - b[2]) <= tolerance &&
               Math.abs(a[3] - b[3]) <= tolerance;
    }

    floodFill(startX, startY, fillColor) {
        const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        const fillColorRgba = this.hexToRgba(fillColor);
        const targetColor = this.getPixel(imageData, startX, startY);
        
        if (this.colorsMatch(targetColor, fillColorRgba)) {
            return;
        }

        const pixelsToCheck = [{x: startX, y: startY}];
        const tolerance = 0;

        while (pixelsToCheck.length > 0) {
            const {x, y} = pixelsToCheck.pop();
            const currentColor = this.getPixel(imageData, x, y);

            if (!this.colorsMatch(currentColor, targetColor, tolerance)) {
                continue;
            }

            this.setPixel(imageData, x, y, fillColorRgba);

            if (x > 0) pixelsToCheck.push({x: x - 1, y: y});
            if (x < this.canvas.width - 1) pixelsToCheck.push({x: x + 1, y: y});
            if (y > 0) pixelsToCheck.push({x: x, y: y - 1});
            if (y < this.canvas.height - 1) pixelsToCheck.push({x: x, y: y + 1});
        }

        this.ctx.putImageData(imageData, 0, 0);
        this.saveHistory();
    }

    hexToRgba(hex) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return [r, g, b, 255];
    }

    getCoordinates(event) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        const x = (event.clientX - rect.left) * scaleX;
        const y = (event.clientY - rect.top) * scaleY;
        return { x, y };
    }

    startDrawing(event) {
        this.drawing = true;
        this.ctx.beginPath();
        const { x, y } = this.getCoordinates(event);
        this.ctx.moveTo(x, y);
    }

    draw(event) {
        if (!this.drawing || this.isFillTool) return;
        const { x, y } = this.getCoordinates(event);

        this.ctx.lineWidth = this.brushSize;
        this.ctx.lineCap = "round";

        if (this.isEraser) {
            this.ctx.strokeStyle = "#FFFFFF"; // sau culoarea fundalului
        } else {
            this.ctx.strokeStyle = this.brushColor;
        }

        this.ctx.lineTo(x, y);
        this.ctx.stroke();
    }

    stopDrawing() {
        if (this.drawing) {
            this.drawing = false;
            this.ctx.closePath();
            this.saveHistory();
        }
    }

    saveHistory() {
        this.history.push(this.canvas.toDataURL());
    }

    newImage() {
        this.clearCanvas();
        this.history = [];
        this.saveHistory();
    }

    loadImage() {
        document.getElementById("imageLoader").click();
    }

    handleImageUpload(event) {
        const file = event.target.files[0];
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                this.clearCanvas();
                this.ctx.drawImage(img, 0, 0, this.canvas.width, this.canvas.height);
                this.saveHistory();
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    clearCanvas() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.saveHistory();
    }

    saveImage() {
        const link = document.createElement("a");
        link.download = "paint_image.png";
        link.href = this.canvas.toDataURL("image/png").replace("image/png", "image/octet-stream");
        link.click();
    }
}

// Inițializare
document.addEventListener("DOMContentLoaded", () => {
    const paintApp = new PaintApp("paintCanvas");

    document.getElementById("colorPicker").addEventListener("input", (event) => {
        paintApp.setColor(event.target.value);
    });

    document.getElementById("brushSize").addEventListener("input", (event) => {
        paintApp.setSize(event.target.value);
    });
});