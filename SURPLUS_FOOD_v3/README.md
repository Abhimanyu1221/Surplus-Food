# Surplus Food Redistribution Platform (v2)

A full-stack, real-time social impact web application connecting Hotels/Restaurants that have surplus food with NGOs and individual Volunteers who can distribute it in Pune, India.

## Features

* **Three-Role System**: Dedicated flows for **Hotels** (Donors), **NGOs** (Distributors), and **Volunteers** (Independent Pickup Agents).
* **Real-time Live Feed**: Dashboards auto-refresh and poll every 20 seconds, allowing users to see new surplus food listings instantly.
* **Region-Based Filtering**: Listings are categorized by predefined Pune regions (e.g., Kothrud, Shivajinagar) so users can find food nearest to them. Filter directly on the dashboard.
* **Live Food Map**: A zero-cost, Leaflet-based dynamic map that visualizes active food listings on an interactive map clustered by Pune region.
* **OTP Lock & Claim System**: Secure pickup validation flow. NGOs and Volunteers reserve food (which hides it from others), generating a secure 4-digit OTP. The hotel verifies the OTP upon pickup to mark the listing as collected.

## Tech Stack

* **Frontend**: React.js (Vite), React Router DOM, Axios, Lucide-React, Vanilla CSS, React-Leaflet.
* **Backend**: Python, FastAPI, Pydantic schemas.
* **Database**: MongoDB (via Motor AsyncIO).

## Prerequisites

1. **Node.js** (v16+ recommended)
2. **Python** (v3.9+ recommended)
3. **MongoDB** (Local instance running, or an Atlas URI)

## How to Run the App Local Environment

### 1. Setup Backend (FastAPI + MongoDB)

1. Open a terminal and navigate to the `backend` folder:
   ```bash
   cd backend
   ```
2. Create a virtual environment and activate it:
   ```bash
   python -m venv venv
   # Windows:
   .\venv\Scripts\activate
   # Mac/Linux:
   source venv/bin/activate
   ```
3. Install Python dependencies (FastAPI, Uvicorn, Motor, etc.):
   ```bash
   pip install -r requirements.txt
   ```
   *(Note: Ensure you have `fastapi`, `uvicorn`, `motor`, `pydantic`, `dnspython` installed).*
4. Start the backend server:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```
   The backend API will run at `http://localhost:8000`.

### 2. Setup Frontend (React + Vite)

1. Open a new terminal and navigate to the `frontend` folder:
   ```bash
   cd frontend
   ```
2. Install npm dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
   The frontend will run at `http://localhost:5173`.

### 3. Using the App

* Open your browser to `http://localhost:5173`.
* **Testing Flow**: Let one window act as a Hotel, and another as an NGO/Volunteer. 
  1. Register a Hotel and post a food listing in a specific region.
  2. See it appear in the other window securely.
  3. "Claim" the food from the NGO account to generate an OTP.
  4. Submit the OTP on the Hotel account to complete the pickup cycle.

## Project Structure
```text
SURPLUS FOOD/
├── backend/
│   ├── app/
│   │   ├── config/       # Database configuration
│   │   ├── models/       # Pydantic base models
│   │   ├── routes/       # FastAPI route endpoints
│   │   ├── schemas/      # Request/Response schemas
│   │   └── services/     # Business logic and DB queries
│   └── main.py           # FastAPI application entry point
└── frontend/
    ├── src/
    │   ├── context/      # React Auth Context for role persistence
    │   ├── hooks/        # Custom hooks (e.g., usePolling for live-feed)
    │   ├── pages/        # Route views (Login, Dashboards, MapView)
    │   ├── services/     # Axios API wrapper functions
    │   ├── utils/        # Constants (like Pune region coordinates)
    │   ├── App.jsx       # Routing and navigation shell
    │   └── index.css     # Clean Dark-mode Glassmorphism UI
    └── index.html        # Vite HTML entry
```
