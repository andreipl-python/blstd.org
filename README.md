# BLSTD.ORG - CRM System

A comprehensive CRM system built with Django for managing bookings, services, and client relationships.

## Features

- Booking management system
- Service and specialist scheduling
- Client management
- Equipment rental tracking
- Dynamic service filtering
- User-friendly booking modal interface

## Tech Stack

- Python/Django
- JavaScript/jQuery
- Bootstrap
- Chosen.js
- SQLite (Database)

## Installation

1. Clone the repository:
```bash
git clone https://github.com/andreipl-python/blstd.org.git
```

2. Create and activate virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Apply migrations:
```bash
python manage.py migrate
```

5. Run the development server:
```bash
python manage.py runserver
```

## Project Structure

- `mycrm/` - Main Django project directory
  - `booking/` - Booking management application
  - `templates/` - HTML templates
  - `static/` - Static files (CSS, JS, images)

## Security

This is a private repository. Access is restricted to authorized collaborators only.
