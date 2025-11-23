# CareLink

A healthcare management system for patients and pharmacists, built with Flask (backend) and React (frontend).

## Prerequisites

Before you begin, ensure you have the following installed:

- **Python 3.10+** - [Download Python](https://www.python.org/downloads/)
- **Node.js 20.19+ or 22.12+** - [Download Node.js](https://nodejs.org/)
- **npm** (comes with Node.js) or **yarn**

## Development Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd carelink
```

### 2. Backend Setup (Flask)

#### Create a Virtual Environment

```bash
# Create virtual environment
python3 -m venv .venv

# Activate virtual environment
# On macOS/Linux:
source .venv/bin/activate

# On Windows:
.venv\Scripts\activate
```

#### Install Python Dependencies

```bash
pip install -r requirements.txt
```

#### Initialize the Database

```bash
python init_db.py
```

This will create a SQLite database (`carelink.db`) with the necessary tables and sample data.

#### Run the Flask Backend

```bash
python app.py
```

The Flask server will start on `http://127.0.0.1:5000`

### 3. Frontend Setup (React)

#### Navigate to Frontend Directory

```bash
cd frontend
```

#### Install Dependencies

```bash
npm install
```

#### Run the Development Server

```bash
npm run dev
```

The Vite development server will start on `http://localhost:3000`

The frontend is configured to proxy API requests to the Flask backend automatically.

### 4. Running the Full Application

You need to run both servers simultaneously:

1. **Terminal 1 - Flask Backend:**
   ```bash
   # Activate virtual environment (if not already activated)
   source .venv/bin/activate  # macOS/Linux
   # or
   .venv\Scripts\activate  # Windows
   
   # Run Flask server
   python app.py
   ```

2. **Terminal 2 - React Frontend:**
   ```bash
   cd frontend
   npm run dev
   ```

3. **Open your browser:**
   - Frontend: http://localhost:3000
   - Backend API: http://127.0.0.1:5000

## Available Scripts

### Backend (Flask)

- `python app.py` - Run the Flask development server

### Frontend (React)

- `npm run dev` - Start Vite development server
## Default Credentials

### Pharmacist Login
- **Username:** `pharm01`
- **Password:** `test123`

### Sample Patients
- Patient ID: `P001`


## Technology Stack

- **Backend:** Flask (Python)
- **Frontend:** React 19 + TypeScript
- **Build Tool:** Vite
- **Routing:** React Router
- **HTTP Client:** Axios
- **Charts:** Chart.js
- **Database:** SQLite
- **Styling:** Bootstrap 5 + Custom CSS

