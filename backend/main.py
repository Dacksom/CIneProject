from fastapi import FastAPI, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from pydantic import BaseModel
from typing import List, Dict, Optional
from uuid import uuid4
import qrcode
import io
import base64

app = FastAPI(title="CinePay Backend Demo")

# Habilitar CORS para todos los orígenes
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Modelos ---
class Movie(BaseModel):
    id: str
    title: str
    duration: str
    price: float
    poster: str

class Seat(BaseModel):
    id: str
    row: str
    number: int
    is_reserved: bool = False
    reserved_by: Optional[str] = None  # reservation_id

class Reservation(BaseModel):
    id: str
    movie_id: str
    seats: List[str]
    email: str
    paid: bool = False

# --- Datos en memoria ---
MOVIES = [
    Movie(id="avengers", title="Avengers: Endgame", duration="3h 1min", price=12.50, poster="img/avengers.jpeg"),
    Movie(id="spiderman", title="Spider-Man: No Way Home", duration="2h 28min", price=11.00, poster="img/spiderman.webp"),
    Movie(id="batman", title="The Batman", duration="2h 56min", price=13.00, poster="img/batman.jpg"),
]

SEATS: Dict[str, List[Seat]] = {}
for movie in MOVIES:
    SEATS[movie.id] = [
        Seat(id=f"A{i+1}", row="A", number=i+1) for i in range(8)
    ] + [
        Seat(id=f"B{i+1}", row="B", number=i+1) for i in range(8)
    ] + [
        Seat(id=f"C{i+1}", row="C", number=i+1) for i in range(8)
    ]

RESERVATIONS: Dict[str, Reservation] = {}

# --- Endpoints ---
@app.get("/movies", response_model=List[Movie])
def get_movies():
    return MOVIES

@app.get("/movies/{movie_id}/seats", response_model=List[Seat])
def get_seats(movie_id: str):
    if movie_id not in SEATS:
        raise HTTPException(status_code=404, detail="Película no encontrada")
    return SEATS[movie_id]

class ReserveRequest(BaseModel):
    movie_id: str
    seats: List[str]
    email: str

@app.post("/reserve", response_model=Reservation)
def reserve_seats(req: ReserveRequest):
    if req.movie_id not in SEATS:
        raise HTTPException(status_code=404, detail="Película no encontrada")
    available = SEATS[req.movie_id]
    # Verificar disponibilidad
    for seat_id in req.seats:
        seat = next((s for s in available if s.id == seat_id), None)
        if not seat or seat.is_reserved:
            raise HTTPException(status_code=400, detail=f"Asiento {seat_id} no disponible")
    # Reservar
    reservation_id = str(uuid4())
    for seat_id in req.seats:
        seat = next(s for s in available if s.id == seat_id)
        seat.is_reserved = True
        seat.reserved_by = reservation_id
    reservation = Reservation(id=reservation_id, movie_id=req.movie_id, seats=req.seats, email=req.email)
    RESERVATIONS[reservation_id] = reservation
    return reservation

class PayRequest(BaseModel):
    reservation_id: str
    card_number: str
    expiry: str
    cvv: str
    card_name: str

@app.post("/pay")
def pay_reservation(req: PayRequest):
    reservation = RESERVATIONS.get(req.reservation_id)
    if not reservation:
        raise HTTPException(status_code=404, detail="Reserva no encontrada")
    if reservation.paid:
        raise HTTPException(status_code=400, detail="Reserva ya pagada")
    # Simular pago exitoso
    reservation.paid = True
    # Generar QR con la URL local
    qr_url = f"http://192.168.1.202:8000/ticket/{reservation.id}"
    qr_img = qrcode.make(qr_url)
    buf = io.BytesIO()
    qr_img.save(buf, format='PNG')
    qr_base64 = base64.b64encode(buf.getvalue()).decode('utf-8')
    return {"success": True, "reservation_id": reservation.id, "qr_base64": qr_base64, "qr_url": qr_url}

@app.get("/reservation/{reservation_id}", response_model=Reservation)
def get_reservation(reservation_id: str):
    reservation = RESERVATIONS.get(reservation_id)
    if not reservation:
        raise HTTPException(status_code=404, detail="Reserva no encontrada")
    return reservation

@app.get("/ticket/{reservation_id}")
def ticket_html(reservation_id: str):
    reservation = RESERVATIONS.get(reservation_id)
    if not reservation:
        return Response(content="<h2>Reserva no encontrada</h2>", media_type="text/html")
    movie = next((m for m in MOVIES if m.id == reservation.movie_id), None)
    html = f"""
    <html><head><meta name='viewport' content='width=device-width, initial-scale=1.0'>
    <title>Ticket CinePay</title>
    <style>
    body {{ font-family: Arial, sans-serif; background: #222; color: #fff; padding: 20px; }}
    .ticket {{ background: #fff; color: #222; border-radius: 16px; max-width: 400px; margin: 30px auto; padding: 24px; box-shadow: 0 4px 24px #0003; }}
    .ticket h2 {{ color: #fa4515; }}
    .ticket .label {{ font-weight: bold; }}
    .ticket .value {{ float: right; }}
    .ticket .row {{ margin-bottom: 12px; clear: both; }}
    .ticket .qr {{ text-align: center; margin-top: 24px; }}
    </style></head><body>
    <div class='ticket'>
        <h2>🎟️ Ticket CinePay</h2>
        <div class='row'><span class='label'>Película:</span> <span class='value'>{movie.title if movie else reservation.movie_id}</span></div>
        <div class='row'><span class='label'>Asientos:</span> <span class='value'>{', '.join(reservation.seats)}</span></div>
        <div class='row'><span class='label'>Email:</span> <span class='value'>{reservation.email}</span></div>
        <div class='row'><span class='label'>Reserva:</span> <span class='value'>{reservation.id}</span></div>
        <div class='row'><span class='label'>Estado:</span> <span class='value'>{'Pagado' if reservation.paid else 'Pendiente'}</span></div>
        <div class='qr'>
            <img src='https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=http://192.168.1.202:8000/ticket/{reservation.id}' alt='QR'>
            <div style='font-size:12px;color:#888;margin-top:8px;'>Escanea para validar en la entrada</div>
        </div>
    </div>
    </body></html>
    """
    return HTMLResponse(content=html)

