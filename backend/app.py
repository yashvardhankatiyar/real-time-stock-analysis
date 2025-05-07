from flask import Flask, jsonify, request
from flask_cors import CORS
import stock_data
import analysis
import cache
import threading
import time

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Initialize in-memory cache
data_cache = cache.Cache()

# Start background data collection thread
def background_data_collector():
    """Background thread to continuously fetch and update stock data"""
    while True:
        try:
            # Get default watchlist or a configurable one
            watchlist = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META']
            
            # Fetch real-time data for each stock
            for symbol in watchlist:
                # Get data and store in cache
                data = stock_data.get_realtime_data(symbol)
                data_cache.set(f"stock_{symbol}", data)
                
                # Calculate technical indicators
                indicators = analysis.calculate_indicators(data)
                data_cache.set(f"indicators_{symbol}", indicators)
                
            # Sleep for 60 seconds before the next update
            time.sleep(30)
        except Exception as e:
            print(f"Error in background collector: {e}")
            time.sleep(10)  # Shorter sleep on error

# Start the background thread
collector_thread = threading.Thread(target=background_data_collector, daemon=True)
collector_thread.start()

@app.route('/api/stocks', methods=['GET'])
def get_available_stocks():
    """Return list of available stocks"""
    return jsonify({
        'stocks': stock_data.get_available_stocks()
    })

@app.route('/api/stock/<symbol>', methods=['GET'])
def get_stock_data(symbol):
    """Get real-time data for a specific stock"""
    # Try to get from cache first
    cached_data = data_cache.get(f"stock_{symbol}")
    
    if cached_data:
        return jsonify({
            'symbol': symbol,
            'data': cached_data,
            'cached': True
        })
    
    # If not in cache, fetch directly
    try:
        data = stock_data.get_realtime_data(symbol)
        return jsonify({
            'symbol': symbol,
            'data': data,
            'cached': False
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/analysis/<symbol>', methods=['GET'])
def get_stock_analysis(symbol):
    """Get technical analysis for a specific stock"""
    # Try to get from cache first
    cached_indicators = data_cache.get(f"indicators_{symbol}")
    
    if cached_indicators:
        return jsonify({
            'symbol': symbol,
            'indicators': cached_indicators,
            'cached': True
        })
    
    # If not in cache, calculate directly
    try:
        data = stock_data.get_realtime_data(symbol)
        indicators = analysis.calculate_indicators(data)
        return jsonify({
            'symbol': symbol,
            'indicators': indicators,
            'cached': False
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/watchlist', methods=['GET', 'POST'])
def handle_watchlist():
    """Get or update watchlist"""
    if request.method == 'GET':
        watchlist = data_cache.get('watchlist') or ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META']
        return jsonify({'watchlist': watchlist})
    
    elif request.method == 'POST':
        new_watchlist = request.json.get('symbols', [])
        data_cache.set('watchlist', new_watchlist)
        return jsonify({'success': True, 'watchlist': new_watchlist})

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)