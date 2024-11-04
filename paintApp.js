class PaintApp {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext("2d");
        this.drawing = false;
        this.brushColor = "#000000";
        this.brushSize = 5;
        this.history = [];
        this.isEraser = false; // Flag pentru radieră
        
        this.canvas.width = 800;
        this.canvas.height = 600;

        this.setupEventListeners();
        this.saveHistory();
    }

    setColor(color) {
        this.brushColor = color;
        this.isEraser = false; // Dezactivăm radiera atunci când schimbăm culoarea
    }

    setSize(size) {
        this.brushSize = size;
    }

    setBackgroundColor(color) {
        this.ctx.fillStyle = color;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.saveHistory(); // Salvăm starea după ce am schimbat fundalul
    }

    activateEraser() {
        this.isEraser = true;
    }

    setupEventListeners() {
        this.canvas.addEventListener("mousedown", (event) => this.startDrawing(event));
        this.canvas.addEventListener("mousemove", (event) => this.draw(event));
        this.canvas.addEventListener("mouseup", () => this.stopDrawing());
        this.canvas.addEventListener("mouseleave", () => this.stopDrawing());

        document.getElementById("clearButton").addEventListener("click", () => this.clearCanvas());
        document.getElementById("saveButton").addEventListener("click", () => this.saveImage());
        document.getElementById("newImageButton").addEventListener("click", () => this.newImage());
        document.getElementById("loadImageButton").addEventListener("click", () => this.loadImage());
        document.getElementById("imageLoader").addEventListener("change", (event) => this.handleImageUpload(event));
        document.getElementById("backgroundColorPicker").addEventListener("input", (event) => {
            this.setBackgroundColor(event.target.value);
        });
        document.getElementById("eraserButton").addEventListener("click", () => this.activateEraser());
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
        if (!this.drawing) return;
        const { x, y } = this.getCoordinates(event);

        this.ctx.lineWidth = this.brushSize;
        this.ctx.lineCap = "round";

        // Folosim culoarea de radieră dacă radiera este activată
        if (this.isEraser) {
            this.ctx.strokeStyle = "#FFFFFF"; // Sau setăm culoarea fundalului
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
