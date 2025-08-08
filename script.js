// CinePay - Pasarela de Pago para CinesUnidos con Rapikom (Integración FastAPI)
const API_URL = 'http://192.168.1.202:8000'; // IP local del backend

class CinePayGateway {
    constructor() {
        this.currentStep = 1;
        this.selectedMovie = null;
        this.selectedSeats = [];
        this.reservationId = null;
        this.movies = [];
        this.seats = [];
        this.init();
    }

    async init() {
        await this.loadMovies();
        this.bindEvents();
        this.updateProgressBar();
    }

    async loadMovies() {
        try {
            const res = await fetch(`${API_URL}/movies`);
            if (!res.ok) {
                const errText = await res.text();
                throw new Error(`Status: ${res.status} - ${errText}`);
            }
            this.movies = await res.json();
            this.renderMovies();
        } catch (e) {
            console.error('Error cargando películas:', e);
            this.showNotification('Error cargando películas. Ver consola para más detalles.', 'error');
        }
    }

    renderMovies() {
        const grid = document.querySelector('.movies-grid');
        grid.innerHTML = '';
        this.movies.forEach(movie => {
            const card = document.createElement('div');
            card.className = 'movie-card';
            card.dataset.movie = movie.id;
            card.innerHTML = `
                <div class="poster-container">
                    <img src="${movie.poster}" alt="${movie.title}">
                </div>
                <div class="movie-info">
                    <h3>${movie.title}</h3>
                    <p>Acción • ${movie.duration}</p>
                    <span class="price">$${movie.price.toFixed(2)}</span>
                </div>
            `;
            card.addEventListener('click', (e) => this.selectMovie(e));
            grid.appendChild(card);
        });
    }

    async selectMovie(event) {
        const card = event.currentTarget;
        const movieId = card.dataset.movie;
        document.querySelectorAll('.movie-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        this.selectedMovie = this.movies.find(m => m.id === movieId);
        this.selectedSeats = [];
        await this.loadSeats();
        this.updateSummary();
    }

    async loadSeats() {
        if (!this.selectedMovie) return;
        try {
            const res = await fetch(`${API_URL}/movies/${this.selectedMovie.id}/seats`);
            this.seats = await res.json();
            this.renderSeats();
        } catch (e) {
            this.showNotification('Error cargando asientos', 'error');
        }
    }

    renderSeats() {
        // Solo renderizar si estamos en el paso 2
        if (this.currentStep !== 2) return;
        const seatRows = document.querySelectorAll('.seat-row');
        seatRows.forEach(row => {
            const rowLabel = row.dataset.row;
            const seatsDiv = row.querySelector('.seats');
            seatsDiv.innerHTML = '';
            for (let i = 1; i <= 8; i++) {
                const seatId = `${rowLabel}${i}`;
                const seatData = this.seats.find(s => s.id === seatId);
                const seatDiv = document.createElement('div');
                seatDiv.className = 'seat';
                seatDiv.dataset.seat = seatId;
                seatDiv.textContent = i;
                if (seatData && seatData.is_reserved) seatDiv.classList.add('occupied');
                if (this.selectedSeats.includes(seatId)) seatDiv.classList.add('selected');
                seatDiv.addEventListener('click', (e) => this.selectSeat(e));
                seatsDiv.appendChild(seatDiv);
            }
        });
    }

    selectSeat(event) {
        const seat = event.currentTarget;
        const seatId = seat.dataset.seat;
        if (seat.classList.contains('occupied')) return;
        if (seat.classList.contains('selected')) {
            seat.classList.remove('selected');
            this.selectedSeats = this.selectedSeats.filter(s => s !== seatId);
        } else {
            seat.classList.add('selected');
            this.selectedSeats.push(seatId);
        }
        this.updateSummary();
    }

    updateSummary() {
        if (this.selectedMovie) {
            document.getElementById('selected-movie').textContent = this.selectedMovie.title;
            document.getElementById('final-movie').textContent = this.selectedMovie.title;
        }
        if (this.selectedSeats.length > 0) {
            document.getElementById('selected-seats').textContent = this.selectedSeats.join(', ');
            document.getElementById('final-seats').textContent = this.selectedSeats.join(', ');
        }
        this.calculateTotal();
    }

    calculateTotal() {
        let total = 0;
        if (this.selectedMovie) {
            total = this.selectedMovie.price * this.selectedSeats.length;
        }
        document.getElementById('total-price').textContent = `$${total.toFixed(2)}`;
        return total;
    }

    bindEvents() {
        // Paso 1: Siguiente
        const nextBtnInline = document.getElementById('next-btn-inline');
        if (nextBtnInline) {
            nextBtnInline.addEventListener('click', () => this.nextStep());
        }
        // Paso 2: Anterior y Siguiente
        const prevBtn2 = document.getElementById('prev-btn-inline-2');
        const nextBtn2 = document.getElementById('next-btn-inline-2');
        if (prevBtn2) prevBtn2.addEventListener('click', () => this.prevStep());
        if (nextBtn2) nextBtn2.addEventListener('click', () => this.nextStep());
        // Paso 3: Anterior y Pagar
        const prevBtn3 = document.getElementById('prev-btn-inline-3');
        const nextBtn3 = document.getElementById('next-btn-inline-3');
        if (prevBtn3) prevBtn3.addEventListener('click', () => this.prevStep());
        if (nextBtn3) nextBtn3.addEventListener('click', () => this.nextStep());
        // Payment form validation
        this.setupPaymentValidation();
    }

    async nextStep() {
        if (this.currentStep === 1) {
            if (!this.selectedMovie) {
                this.showNotification('Por favor selecciona una película', 'error');
                return;
            }
            await this.loadSeats();
        }
        if (this.currentStep === 2) {
            if (this.selectedSeats.length === 0) {
                this.showNotification('Por favor selecciona al menos un asiento', 'error');
                return;
            }
            // Reservar asientos
            try {
                const res = await fetch(`${API_URL}/reserve`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        movie_id: this.selectedMovie.id,
                        seats: this.selectedSeats,
                        email: document.getElementById('email')?.value || 'demo@cinepay.com',
                    })
                });
                if (!res.ok) throw new Error(await res.text());
                const data = await res.json();
                this.reservationId = data.id;
            } catch (e) {
                this.showNotification('Error reservando asientos', 'error');
                return;
            }
        }
        if (this.currentStep === 3) {
            if (!this.validatePaymentForm()) return;
            // Pagar
            try {
                const res = await fetch(`${API_URL}/pay`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        reservation_id: this.reservationId,
                        card_number: document.getElementById('card-number').value,
                        expiry: document.getElementById('expiry').value,
                        cvv: document.getElementById('cvv').value,
                        card_name: document.getElementById('card-name').value
                    })
                });
                if (!res.ok) throw new Error(await res.text());
                const payData = await res.json();
                // Confirmación
                await this.loadReservation();
                this.currentStep++;
                this.updateStep();
                this.showNotification('Pago procesado exitosamente', 'success');
                // Mostrar QR en la pantalla de confirmación
                if (payData.qr_base64) {
                    const qrImg = document.querySelector('.qr-code img');
                    if (qrImg) {
                        qrImg.src = `data:image/png;base64,${payData.qr_base64}`;
                        qrImg.alt = 'QR de tu ticket';
                    }
                }
                return;
            } catch (e) {
                this.showNotification('Error procesando el pago', 'error');
                return;
            }
        }
        this.currentStep++;
        this.updateStep();
        if (this.currentStep === 2) this.renderSeats();
    }

    async loadReservation() {
        if (!this.reservationId) return;
        try {
            const res = await fetch(`${API_URL}/reservation/${this.reservationId}`);
            if (!res.ok) throw new Error(await res.text());
            const data = await res.json();
            document.getElementById('reservation-code').textContent = data.id;
        } catch (e) {
            this.showNotification('Error cargando confirmación', 'error');
        }
    }

    prevStep() {
        if (this.currentStep > 1) {
            this.currentStep--;
            this.updateStep();
            if (this.currentStep === 2) this.renderSeats();
        }
    }

    updateStep() {
        document.querySelectorAll('.step-content').forEach(step => {
            step.classList.remove('active');
        });
        document.getElementById(`step-${this.currentStep}`).classList.add('active');
        // Mostrar/ocultar el botón Siguiente en línea solo en el paso 1
        const nextBtnInline = document.getElementById('next-btn-inline');
        if (nextBtnInline) {
            nextBtnInline.style.display = (this.currentStep === 1) ? 'inline-flex' : 'none';
        }
        this.updateProgressBar();
    }

    updateProgressBar() {
        document.querySelectorAll('.step').forEach((step, index) => {
            const stepNumber = index + 1;
            step.classList.remove('active', 'completed');
            if (stepNumber === this.currentStep) {
                step.classList.add('active');
            } else if (stepNumber < this.currentStep) {
                step.classList.add('completed');
            }
        });
    }

    setupPaymentValidation() {
        const cardNumber = document.getElementById('card-number');
        if (cardNumber) {
            cardNumber.addEventListener('input', (e) => {
                let value = e.target.value.replace(/\D/g, '');
                value = value.replace(/(\d{4})(?=\d)/g, '$1 ');
                e.target.value = value;
            });
        }
        const expiry = document.getElementById('expiry');
        if (expiry) {
            expiry.addEventListener('input', (e) => {
                let value = e.target.value.replace(/\D/g, '');
                if (value.length >= 2) {
                    value = value.slice(0, 2) + '/' + value.slice(2);
                }
                e.target.value = value;
            });
        }
        const cvv = document.getElementById('cvv');
        if (cvv) {
            cvv.addEventListener('input', (e) => {
                e.target.value = e.target.value.replace(/\D/g, '');
            });
        }
    }

    validatePaymentForm() {
        const cardNumber = document.getElementById('card-number').value.replace(/\s/g, '');
        const expiry = document.getElementById('expiry').value;
        const cvv = document.getElementById('cvv').value;
        const cardName = document.getElementById('card-name').value;
        const email = document.getElementById('email').value;
        if (cardNumber.length < 16) {
            this.showNotification('Número de tarjeta inválido', 'error');
            return false;
        }
        if (!expiry.match(/^\d{2}\/\d{2}$/)) {
            this.showNotification('Fecha de vencimiento inválida', 'error');
            return false;
        }
        if (cvv.length < 3) {
            this.showNotification('CVV inválido', 'error');
            return false;
        }
        if (cardName.trim().length < 3) {
            this.showNotification('Nombre en la tarjeta requerido', 'error');
            return false;
        }
        if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
            this.showNotification('Email inválido', 'error');
            return false;
        }
        return true;
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        document.body.appendChild(notification);
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.cinePay = new CinePayGateway();
});

// Add notification styles
const style = document.createElement('style');
style.textContent = `
    .notification {
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 10px;
        color: white;
        font-weight: 500;
        z-index: 1000;
        animation: slideIn 0.3s ease;
    }
    .notification.success {
        background: #4CAF50;
    }
    .notification.error {
        background: #f44336;
    }
    .notification.info {
        background: #2196F3;
    }
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
`;
document.head.appendChild(style);
