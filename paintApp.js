class PaintApp {
    constructor(canvasId) {
        // Preluăm referința la canvas și setăm contextul de desenare 2D
        this.canvas = document.getElementById(canvasId);
        // Obținem contextul 2D pentru desenare
        this.ctx = this.canvas.getContext("2d");

        // Inițializăm proprietățile de bază pentru aplicația de desenat
        this.drawing = false; // Indică dacă utilizatorul desenează activ
        this.brushColor = "#000000"; // Culoarea implicită a pensulei
        this.brushSize = 5;   // Dimensiunea implicită a pensulei
        this.history = []; // Istoricul pentru a salva acțiunile anterioare
        this.isEraser = false; // Indică dacă este activă radiera
        this.isFillTool = false; // Indică dacă este activă unealta de umplere
        this.currentShape = null; // Forma geometrică curentă (dacă există)
        this.baseImage = null; // Imaginea de bază înainte de desenarea unei forme
        this.startX = 0; // Coordonata X de start
        this.startY = 0; // Coordonata Y de start
        // Add new Bezier curve properties
        this.bezierPoints = [];
        this.isDraggingPoint = false;
        this.selectedPointIndex = -1;
        this.bezierState = 'collecting'; // 'collecting' or 'editing'

        // Setăm dimensiunea canvas-ului
        this.canvas.width = 800;
        this.canvas.height = 600;

        // Inițializare cu pensula activă
        document.getElementById('brushButton').classList.add('active');

        // Inițializăm listener-ii de evenimente și salvăm istoria inițială
        this.setupEventListeners();
        this.saveHistory();
    }

    // Schimbăm culoarea pensulei și dezactivăm radiera
    setColor(color) {
        this.brushColor = color;
        this.isEraser = false;
    }

    // Schimbăm dimensiunea pensulei
    setSize(size) {
        this.brushSize = size;
    }

    // Activăm radiera, schimbăm UI-ul pentru a reflecta această stare
    activateEraser() {
        this.isEraser = true;
        this.isFillTool = false;
        // Actualizare UI
        document.getElementById('brushButton').classList.remove('active');
        document.getElementById('fillButton').classList.remove('active');
        document.getElementById('eraserButton').classList.add('active');
    }

    // Activăm unealta de umplere și schimbăm UI-ul
    activateFillTool() {
        this.isFillTool = true;
        this.isEraser = false;
        // Actualizare UI
        document.getElementById('brushButton').classList.remove('active');
        document.getElementById('fillButton').classList.add('active');
        document.getElementById('eraserButton').classList.remove('active');
    }

    // Activăm pensula și schimbăm UI-ul
    activateBrush() {
        this.isFillTool = false;
        this.isEraser = false;
        // Actualizare UI
        document.getElementById('brushButton').classList.add('active');
        document.getElementById('fillButton').classList.remove('active');
        document.getElementById('eraserButton').classList.remove('active');
    }

    // Setăm listener-ii de evenimente pentru funcționalitatea canvas-ului
    setupEventListeners() {
        // La apăsarea mouseului pe canvas
        this.canvas.addEventListener("mousedown", (event) => {
            if (this.currentShape === 'bezier') {
                const { x, y } = this.getCoordinates(event);
                this.handleBezierMouseDown(x, y);
            } else if (this.isFillTool) {
                const { x, y } = this.getCoordinates(event);
                this.floodFill(Math.round(x), Math.round(y), this.brushColor);
            } else if (this.currentShape) {
                this.baseImage = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
                const { x, y } = this.getCoordinates(event);
                this.startX = x;
                this.startY = y;
                this.drawing = true;
            } else {
                this.startDrawing(event);
            }
        });

        // Când mouse-ul se mișcă pe canvas
        this.canvas.addEventListener("mousemove", (event) => {
            if (this.currentShape === 'bezier' && this.isDraggingPoint) {
                const { x, y } = this.getCoordinates(event);
                this.handleBezierMouseMove(x, y);
            } else if (this.currentShape && this.drawing) {
                this.drawShape(event);
            } else if (!this.currentShape) {
                this.draw(event);
            }
        });

        // Când mouse-ul este ridicat de pe canvas
        this.canvas.addEventListener("mouseup", () => {
            if (this.currentShape === 'bezier') {
                this.isDraggingPoint = false;
                this.selectedPointIndex = -1;
            } else if (this.currentShape && this.drawing) {
                this.finishShape();
            }
            this.stopDrawing();
        });

        // Când mouse-ul iese din canvas
        this.canvas.addEventListener("mouseleave", () => {
            if (this.currentShape && this.drawing) {
                this.finishShape();
            }
            this.stopDrawing();
        });

        // Adăugăm butoanele pentru forme geometrice
        document.getElementById("rectangleButton").addEventListener("click", () => this.setShape('rectangle'));
        document.getElementById("circleButton").addEventListener("click", () => this.setShape('circle'));
        document.getElementById("lineButton").addEventListener("click", () => this.setShape('line'));
        document.getElementById("bezierButton").addEventListener("click", () => this.setShape('bezier'));

        // Butoane pentru acțiuni generale
        document.getElementById("clearButton").addEventListener("click", () => this.clearCanvas());
        document.getElementById("saveButton").addEventListener("click", () => this.saveImage());
        document.getElementById("newImageButton").addEventListener("click", () => this.newImage());
        document.getElementById("loadImageButton").addEventListener("click", () => this.loadImage());
        document.getElementById("imageLoader").addEventListener("change", (event) => this.handleImageUpload(event));
        document.getElementById("eraserButton").addEventListener("click", () => this.activateEraser());
        document.getElementById("fillButton").addEventListener("click", () => this.activateFillTool());
        document.getElementById("brushButton").addEventListener("click", () => this.activateBrush());
        // Selectare culoare fundal
        document.getElementById("backgroundColorPicker").addEventListener("input", (event) => {
            this.canvas.style.backgroundColor = event.target.value;
        });
    }


    // Metodă pentru desenarea formelor geometrice
    drawShape(event) {
        if (!this.drawing || !this.baseImage) return;

        const { x, y } = this.getCoordinates(event);

        // Restaurăm imaginea de bază înainte de desenare pentru a preveni suprapunerea
        this.ctx.putImageData(this.baseImage, 0, 0);
        this.ctx.beginPath();

        // Setăm stilul
        this.ctx.strokeStyle = this.brushColor;
        this.ctx.lineWidth = this.brushSize;
        // Desenarea curbei Bezier
        if (this.currentShape === 'bezier') {
            this.ctx.beginPath();
            this.ctx.moveTo(this.startX, this.startY);

            // Setăm punctele de control și punctul final
            const controlPoint1 = { x: (this.startX + x) / 2, y: this.startY };
            const controlPoint2 = { x: x, y: (this.startY + y) / 2 };
            // Desenăm curba Bezier cu punctele calculate
            this.ctx.bezierCurveTo(
                controlPoint1.x, controlPoint1.y, // Primul punct de control
                controlPoint2.x, controlPoint2.y, // Al doilea punct de control
                x, y                               // Punctul final
            );
        }

        // Desenăm forma selectată
        switch (this.currentShape) {
            case 'rectangle':
                // Desenăm dreptunghi folosind coordonatele minime și dimensiunile
                this.ctx.rect(
                    Math.min(this.startX, x),
                    Math.min(this.startY, y),
                    Math.abs(x - this.startX),
                    Math.abs(y - this.startY)
                );
                break;
            case 'circle':
                // Calculăm raza cercului folosind teorema lui Pitagora
                const radius = Math.sqrt(
                    Math.pow(x - this.startX, 2) + Math.pow(y - this.startY, 2)
                );
                this.ctx.arc(this.startX, this.startY, radius, 0, 2 * Math.PI);
                break;
            case 'line':
                // Desenăm o linie dreaptă între punctul de start și poziția curentă
                this.ctx.moveTo(this.startX, this.startY);
                this.ctx.lineTo(x, y);
                break;
        }

        this.ctx.stroke();
    }
    // Finalizăm desenarea formei și salvăm în istoric
    finishShape() {
        if (this.drawing) {
            this.baseImage = null;
            this.saveHistory();
        }
    }

    // Setăm forma curentă și dezactivăm radiera sau unealta de umplere
    setShape(shape) {
        this.currentShape = shape;
        this.isFillTool = false;
        this.isEraser = false;

        // Actualizare UI
        const buttons = ['brushButton', 'fillButton', 'eraserButton', 'rectangleButton', 'circleButton', 'lineButton'];
        buttons.forEach(btn => document.getElementById(btn).classList.remove('active'));
        document.getElementById(shape + 'Button').classList.add('active');
    }

    activateBrush() {
        this.currentShape = null;
        this.isFillTool = false;
        this.isEraser = false;
        // Actualizare UI
        const buttons = ['brushButton', 'fillButton', 'eraserButton', 'rectangleButton', 'circleButton', 'lineButton'];
        buttons.forEach(btn => document.getElementById(btn).classList.remove('active'));
        document.getElementById('brushButton').classList.add('active');
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


    // Funcția "Flood Fill" pentru a umple o zonă de culoarea aleasă
    floodFill(startX, startY, fillColor) {
        const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        const fillColorRgba = this.hexToRgba(fillColor);
        const targetColor = this.getPixel(imageData, startX, startY);

        if (this.colorsMatch(targetColor, fillColorRgba)) {
            return;
        }

        const pixelsToCheck = [{ x: startX, y: startY }];
        const tolerance = 0;

        while (pixelsToCheck.length > 0) {
            const { x, y } = pixelsToCheck.pop();
            const currentColor = this.getPixel(imageData, x, y);

            if (!this.colorsMatch(currentColor, targetColor, tolerance)) {
                continue;
            }

            this.setPixel(imageData, x, y, fillColorRgba);

            if (x > 0) pixelsToCheck.push({ x: x - 1, y: y });
            if (x < this.canvas.width - 1) pixelsToCheck.push({ x: x + 1, y: y });
            if (y > 0) pixelsToCheck.push({ x: x, y: y - 1 });
            if (y < this.canvas.height - 1) pixelsToCheck.push({ x: x, y: y + 1 });
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

    // Obținem coordonatele corecte ale cursorului pe canvas
    getCoordinates(event) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        const x = (event.clientX - rect.left) * scaleX;
        const y = (event.clientY - rect.top) * scaleY;
        return { x, y };
    }

    // Începem desenarea unei linii
    startDrawing(event) {
        this.drawing = true;
        this.ctx.beginPath();
        const { x, y } = this.getCoordinates(event);
        this.ctx.moveTo(x, y);
    }

    // Desenăm o linie continuă pe măsură ce mouse-ul se mișcă
    draw(event) {
        // Verificăm dacă desenarea este activă și nu folosim unealta de umplere
        if (!this.drawing || this.isFillTool) return;
        const { x, y } = this.getCoordinates(event);

        // Setăm proprietățile liniei
        this.ctx.lineWidth = this.brushSize;
        this.ctx.lineCap = "round"; // Face ca capetele liniei să fie rotunjit

        // Dacă radiera e activă, desenăm cu alb
        if (this.isEraser) {
            this.ctx.strokeStyle = "#FFFFFF"; // Alb pentru radieră
        } else {
            this.ctx.strokeStyle = this.brushColor; // Culoarea selectată pentru pensulă
        }

        // Desenăm linia până la poziția curentă
        this.ctx.lineTo(x, y);
        this.ctx.stroke();
    }

    // Oprim desenarea liniei curente și salvăm în istoric
    stopDrawing() {
        if (this.drawing) {
            this.drawing = false;
            this.ctx.closePath(); // Închide calea curentă de desenare
            this.saveHistory(); // Salvează starea curentă în istoric
        }
    }

    // Salvăm istoricul desenului 
    saveHistory() {
        // Convertește canvas-ul în format de date URL și îl adaugă în istoric
        this.history.push(this.canvas.toDataURL());
    }

    // Creează o nouă imagine goala
    newImage() {
        this.clearCanvas(); // Șterge conținutul actual
        this.history = []; // Resetează istoricul 
        this.saveHistory(); // Salvează starea goală în istoric
    }

    // Declanșează dialogul de încărcare a imaginii
    loadImage() {
        document.getElementById("imageLoader").click(); // Simulează click pe input-ul de tip file ascuns
    }

    // Procesează încărcarea unei imagini
    handleImageUpload(event) {
        const file = event.target.files[0]; // Obține fișierul selectat
        const reader = new FileReader(); // Creează un cititor de fișiere
        // Când citirea fișierului este completă 
        reader.onload = (e) => {
            const img = new Image(); // Creează un nou element de imagine
            // Când imaginea este încărcată
            img.onload = () => {
                this.clearCanvas();
                // Desenează imaginea pe întregul canvas, scalată la dimensiunile acestuia
                this.ctx.drawImage(img, 0, 0, this.canvas.width, this.canvas.height);
                this.saveHistory(); // Salvează noua stare în istoric
            };
            img.src = e.target.result; // Setează sursa imaginii
        };
        reader.readAsDataURL(file); // Citește fișierul ca URL de date
    }

    // Șterge tot conținutul canvas-ului
    clearCanvas() {
        // Șterge tot conținutul din dreptunghiul care acoperă întregul canva
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.saveHistory(); // Salvează starea goală în istoric
    }

    handleBezierMouseDown(x, y) {
        // Check if we're clicking near an existing point
        const pointIndex = this.findNearestPoint(x, y);

        if (pointIndex !== -1) {
            this.isDraggingPoint = true;
            this.selectedPointIndex = pointIndex;
            return;
        }

        if (this.bezierState === 'collecting' && this.bezierPoints.length < 4) {
            this.bezierPoints.push({ x, y });

            // If we have all points, switch to editing mode
            if (this.bezierPoints.length === 4) {
                this.bezierState = 'editing';
            }

            this.drawBezierGuide();
        }
    }
    // Salvează imaginea pe calculator
    saveImage() {
        // Creează un element de tip link
        const link = document.createElement("a");
        // Setează numele fișierului de descărcat
        link.download = "paint_image.png";
        // Convertește canvas-ul în URL de date și îl setează ca destinație pentru descărcare
        link.href = this.canvas.toDataURL("image/png").replace("image/png", "image/octet-stream");
        // Simulează click pe link pentru a începe descărcarea
        link.click();
    }

    handleBezierMouseDown(x, y) {
        // Check if we're clicking near an existing point
        const pointIndex = this.findNearestPoint(x, y);

        if (pointIndex !== -1) {
            this.isDraggingPoint = true;
            this.selectedPointIndex = pointIndex;
            return;
        }

        if (this.bezierState === 'collecting' && this.bezierPoints.length < 4) {
            this.bezierPoints.push({ x, y });

            // If we have all points, switch to editing mode
            if (this.bezierPoints.length === 4) {
                this.bezierState = 'editing';
            }

            this.drawBezierGuide();
        }
    }

    handleBezierMouseMove(x, y) {
        if (this.isDraggingPoint && this.selectedPointIndex !== -1) {
            this.bezierPoints[this.selectedPointIndex] = { x, y };
            this.drawBezierGuide();
        }
    }

    findNearestPoint(x, y) {
        const threshold = 10; // Distance threshold for point selection
        for (let i = 0; i < this.bezierPoints.length; i++) {
            const point = this.bezierPoints[i];
            const distance = Math.sqrt(Math.pow(point.x - x, 2) + Math.pow(point.y - y, 2));
            if (distance < threshold) {
                return i;
            }
        }
        return -1;
    }

    drawBezierGuide() {
        // Restore the base image if it exists
        if (this.baseImage) {
            this.ctx.putImageData(this.baseImage, 0, 0);
        }

        // Draw guide points and lines
        this.ctx.save();

        // Draw points
        this.bezierPoints.forEach((point, index) => {
            this.ctx.beginPath();
            this.ctx.arc(point.x, point.y, 4, 0, 2 * Math.PI);
            this.ctx.fillStyle = index === 0 || index === 3 ? 'blue' : 'red';
            this.ctx.fill();
        });

        // Draw guide lines
        if (this.bezierPoints.length >= 2) {
            this.ctx.beginPath();
            this.ctx.setLineDash([5, 5]);
            this.ctx.strokeStyle = '#999';
            this.ctx.moveTo(this.bezierPoints[0].x, this.bezierPoints[0].y);

            for (let i = 1; i < this.bezierPoints.length; i++) {
                this.ctx.lineTo(this.bezierPoints[i].x, this.bezierPoints[i].y);
            }

            this.ctx.stroke();
        }

        // Draw the actual Bezier curve if we have all points
        if (this.bezierPoints.length === 4) {
            this.ctx.beginPath();
            this.ctx.setLineDash([]);
            this.ctx.strokeStyle = this.brushColor;
            this.ctx.lineWidth = this.brushSize;

            this.ctx.moveTo(this.bezierPoints[0].x, this.bezierPoints[0].y);
            this.ctx.bezierCurveTo(
                this.bezierPoints[1].x, this.bezierPoints[1].y,
                this.bezierPoints[2].x, this.bezierPoints[2].y,
                this.bezierPoints[3].x, this.bezierPoints[3].y
            );

            this.ctx.stroke();
        }

        this.ctx.restore();
    }

    setShape(shape) {
        // Dacă ieșim din modul Bezier, finalizăm curba și curățăm ghidajele
        if (this.currentShape === 'bezier' && shape !== 'bezier') {
            if (this.bezierPoints.length === 4) {
                // Restaurăm imaginea de bază (fără ghidaje)
                if (this.baseImage) {
                    this.ctx.putImageData(this.baseImage, 0, 0);
                }

                // Desenăm doar curba Bezier finală
                this.ctx.beginPath();
                this.ctx.strokeStyle = this.brushColor;
                this.ctx.lineWidth = this.brushSize;

                this.ctx.moveTo(this.bezierPoints[0].x, this.bezierPoints[0].y);
                this.ctx.bezierCurveTo(
                    this.bezierPoints[1].x, this.bezierPoints[1].y,
                    this.bezierPoints[2].x, this.bezierPoints[2].y,
                    this.bezierPoints[3].x, this.bezierPoints[3].y
                );

                this.ctx.stroke();

                // Salvăm în istoric
                this.saveHistory();
            } else {
                // Dacă nu am terminat curba, restaurăm starea anterioară
                if (this.baseImage) {
                    this.ctx.putImageData(this.baseImage, 0, 0);
                }
            }

            // Resetăm toate variabilele legate de Bezier
            this.bezierPoints = [];
            this.bezierState = 'collecting';
            this.isDraggingPoint = false;
            this.selectedPointIndex = -1;
            this.baseImage = null;
        }

        // Setăm noua unealtă
        this.currentShape = shape;
        this.isFillTool = false;
        this.isEraser = false;

        // Inițializăm starea Bezier dacă intrăm în modul Bezier
        if (shape === 'bezier') {
            this.bezierPoints = [];
            this.bezierState = 'collecting';
            this.isDraggingPoint = false;
            this.selectedPointIndex = -1;
            // Salvăm starea curentă a canvas-ului înainte de a începe desenarea Bezier
            this.baseImage = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        }

        // Actualizare UI
        const buttons = ['brushButton', 'fillButton', 'eraserButton', 'rectangleButton', 'circleButton', 'lineButton', 'bezierButton'];
        buttons.forEach(btn => document.getElementById(btn).classList.remove('active'));
        document.getElementById(shape + 'Button').classList.add('active');
    }


    // Modificăm și finishShape pentru a gestiona ieșirea din modul Bezier
    // Modificăm și finishShape pentru a gestiona mai bine curățarea
    finishShape() {
        if (this.currentShape === 'bezier' && this.bezierPoints.length === 4) {
            // Restaurăm imaginea de bază
            if (this.baseImage) {
                this.ctx.putImageData(this.baseImage, 0, 0);
            }

            // Desenăm doar curba finală
            this.ctx.beginPath();
            this.ctx.strokeStyle = this.brushColor;
            this.ctx.lineWidth = this.brushSize;

            this.ctx.moveTo(this.bezierPoints[0].x, this.bezierPoints[0].y);
            this.ctx.bezierCurveTo(
                this.bezierPoints[1].x, this.bezierPoints[1].y,
                this.bezierPoints[2].x, this.bezierPoints[2].y,
                this.bezierPoints[3].x, this.bezierPoints[3].y
            );

            this.ctx.stroke();
        }

        if (this.drawing) {
            this.baseImage = null;
            this.saveHistory();
        }
    }

    // Adăugăm o metodă pentru a curăța explicit ghidajele Bezier
    clearBezierGuides() {
        if (this.baseImage) {
            this.ctx.putImageData(this.baseImage, 0, 0);
            this.drawBezierGuide(true); // Desenăm doar curba finală
        }
    }

    // Modificăm drawBezierGuide pentru a putea desena opțional doar curba finală
    drawBezierGuide(onlyFinalCurve = false) {
        // Restore the base image if it exists
        if (this.baseImage) {
            this.ctx.putImageData(this.baseImage, 0, 0);
        }

        // Draw the actual Bezier curve if we have all points
        if (this.bezierPoints.length === 4) {
            this.ctx.beginPath();
            this.ctx.setLineDash([]);
            this.ctx.strokeStyle = this.brushColor;
            this.ctx.lineWidth = this.brushSize;

            this.ctx.moveTo(this.bezierPoints[0].x, this.bezierPoints[0].y);
            this.ctx.bezierCurveTo(
                this.bezierPoints[1].x, this.bezierPoints[1].y,
                this.bezierPoints[2].x, this.bezierPoints[2].y,
                this.bezierPoints[3].x, this.bezierPoints[3].y
            );

            this.ctx.stroke();
        }

        if (!onlyFinalCurve) {
            // Draw guide points and lines
            this.ctx.save();

            // Draw points
            this.bezierPoints.forEach((point, index) => {
                this.ctx.beginPath();
                this.ctx.arc(point.x, point.y, 4, 0, 2 * Math.PI);
                this.ctx.fillStyle = index === 0 || index === 3 ? 'blue' : 'red';
                this.ctx.fill();
            });

            // Draw guide lines
            if (this.bezierPoints.length >= 2) {
                this.ctx.beginPath();
                this.ctx.setLineDash([5, 5]);
                this.ctx.strokeStyle = '#999';
                this.ctx.moveTo(this.bezierPoints[0].x, this.bezierPoints[0].y);

                for (let i = 1; i < this.bezierPoints.length; i++) {
                    this.ctx.lineTo(this.bezierPoints[i].x, this.bezierPoints[i].y);
                }

                this.ctx.stroke();
            }

            this.ctx.restore();
        }
    }
    // Modificăm și handleBezierMouseDown pentru a gestiona mai bine starea de bază
    handleBezierMouseDown(x, y) {
        // Verificăm dacă facem click aproape de un punct existent
        const pointIndex = this.findNearestPoint(x, y);

        if (pointIndex !== -1) {
            this.isDraggingPoint = true;
            this.selectedPointIndex = pointIndex;
            return;
        }

        if (this.bezierState === 'collecting' && this.bezierPoints.length < 4) {
            // Dacă este primul punct, salvăm starea curentă a canvas-ului
            if (this.bezierPoints.length === 0) {
                this.baseImage = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
            }

            this.bezierPoints.push({ x, y });

            if (this.bezierPoints.length === 4) {
                this.bezierState = 'editing';
            }

            this.drawBezierGuide();
        }
    }
}

// Inițializare

// Așteaptă până când documentul HTML este complet încărcat
document.addEventListener("DOMContentLoaded", () => {

    // Creează o nouă instanță a aplicației Paint
    const paintApp = new PaintApp("paintCanvas");

    // Configurează evenimentul pentru selectorul de culoare
    document.getElementById("colorPicker").addEventListener("input", (event) => {
        paintApp.setColor(event.target.value); // Actualizează culoarea pensulei
    });

    // Configurează evenimentul pentru selectorul de dimensiune a pensulei
    document.getElementById("brushSize").addEventListener("input", (event) => {
        paintApp.setSize(event.target.value); // Actualizează dimensiunea pensulei
    });
});