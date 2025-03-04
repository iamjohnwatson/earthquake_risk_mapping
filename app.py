# app.py
from flask import Flask, render_template, jsonify
import requests
import datetime

app = Flask(__name__)

# USGS feed URL (adjust feed as needed, e.g., all_day, significant_hour, etc.)
USGS_URL = "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson"

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/earthquakes')
def get_earthquakes():
    response = requests.get(USGS_URL)
    data = response.json()

    # Perform simple risk analysis
    magnitudes = [feature['properties']['mag'] for feature in data['features'] if feature['properties']['mag'] is not None]
    avg_mag = sum(magnitudes) / len(magnitudes) if magnitudes else 0
    # Count events with magnitude 5.0 or above (adjust threshold as needed)
    high_risk_events = [feature for feature in data['features'] if feature['properties']['mag'] and feature['properties']['mag'] >= 5.0]

    analysis = {
        "average_magnitude": round(avg_mag, 2),
        "high_risk_count": len(high_risk_events),
        "timestamp": datetime.datetime.utcnow().isoformat() + "Z"
    }

    return jsonify({
        "data": data,
        "analysis": analysis
    })

if __name__ == '__main__':
    app.run(debug=True)
