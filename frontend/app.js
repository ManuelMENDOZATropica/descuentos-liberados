document.addEventListener('DOMContentLoaded', () => {
    const video = document.getElementById('video');
    const canvas = document.getElementById('canvas');
    const captureBtn = document.getElementById('capture-btn');
    const loadingView = document.getElementById('loading-view');
    const resultView = document.getElementById('result-view');
    const resetBtn = document.getElementById('reset-btn');
    
    // Result elements
    const discountAmount = document.getElementById('discount-amount');
    const discountMessage = document.getElementById('discount-message');
    const wordsContainer = document.getElementById('words-container');

    // Start Camera
    async function startCamera() {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            console.error("Camera API not available. This is usually because the site is not running on HTTPS or localhost.");
            alert("Tu navegador bloqueó el acceso a la cámara. Para usar la cámara, la web DEBE abrirse con 'https://' o desde 'localhost'.");
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' }, // Usa cámara trasera si está disponible
                audio: false
            });
            video.srcObject = stream;
        } catch (err) {
            console.error("Error accessing the camera", err);
            alert("No se pudo acceder a la cámara. Por favor, asegúrate de darle permiso al navegador en tu dispositivo.");
        }
    }

    // Stop Camera
    function stopCamera() {
        if (video.srcObject) {
            video.srcObject.getTracks().forEach(track => track.stop());
        }
    }

    // Take Picture and send to API
    async function takePicture() {
        // Reproducir flash UI (opcional)
        document.body.style.backgroundColor = "white";
        setTimeout(() => document.body.style.backgroundColor = "", 100);

        const context = canvas.getContext('2d');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Mostrar loading
        loadingView.classList.remove('hidden');

        canvas.toBlob(async (blob) => {
            const formData = new FormData();
            formData.append('image', blob, 'capture.jpg');

            try {
                // Si estamos en Vercel, usamos el prefijo del experimentalService. Si es local, usamos localhost:3000
                const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
                const apiUrl = isLocalhost ? 'http://localhost:3000/api/analyze' : '/_/backend/api/analyze';

                const response = await fetch(apiUrl, {
                    method: 'POST',
                    body: formData
                });

                if (!response.ok) throw new Error("Error en la respuesta del servidor");

                const data = await response.json();
                showResults(data);
            } catch (error) {
                console.error("Error:", error);
                alert("Hubo un error al analizar la imagen. Intenta de nuevo.");
                loadingView.classList.add('hidden');
            }
        }, 'image/jpeg', 0.8);
    }

    // Animate number counting
    function animateValue(obj, start, end, duration) {
        let startTimestamp = null;
        const step = (timestamp) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            obj.innerHTML = Math.floor(progress * (end - start) + start);
            if (progress < 1) {
                window.requestAnimationFrame(step);
            }
        };
        window.requestAnimationFrame(step);
    }

    // Show Results
    function showResults(data) {
        loadingView.classList.add('hidden');
        resultView.classList.remove('hidden');
        stopCamera();

        discountMessage.textContent = data.message || (data.discount > 0 ? "¡Felicidades!" : "Sigue intentando con otra pancarta.");
        
        // Render tags
        wordsContainer.innerHTML = '';
        if (data.words && data.words.length > 0) {
            data.words.forEach(word => {
                const span = document.createElement('span');
                span.className = 'tag';
                span.textContent = word;
                wordsContainer.appendChild(span);
            });
        } else {
            wordsContainer.innerHTML = '<span class="tag">Ninguna palabra detectada</span>';
        }

        // Animate discount number
        animateValue(discountAmount, 0, data.discount || 0, 1500);
    }

    // Reset Flow
    resetBtn.addEventListener('click', () => {
        resultView.classList.add('hidden');
        startCamera();
    });

    captureBtn.addEventListener('click', takePicture);

    // Initialize
    startCamera();
});
