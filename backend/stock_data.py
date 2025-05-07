import yfinance as yf
import pandas as pd
from datetime import datetime, timedelta

# Default stocks list - this could be expanded or made configurable
DEFAULT_STOCKS = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'TSLA', 'NVDA', 'JPM', 'V', 'JNJ']

def get_available_stocks():
    """Returns a list of available stocks for analysis"""
    # In a real application, this could be expanded to fetch more symbols
    # from various sources or APIs
    return DEFAULT_STOCKS

def get_realtime_data(symbol, period='1d', interval='1m'):
    """
    Fetch real-time stock data for the given symbol
    
    Args:
        symbol (str): Stock ticker symbol
        period (str): Time period to fetch (1d, 5d, 1mo, etc.)
        interval (str): Data interval (1m, 5m, 15m, 1h, 1d, etc.)
        
    Returns:
        dict: Dictionary with price data and metadata
    """
    try:
        # Fetch data from Yahoo Finance
        ticker = yf.Ticker(symbol)
        hist = ticker.history(period=period, interval=interval)
        
        # Get latest quote information
        quote = ticker.info
        
        # Format the historical data
        if not hist.empty:
            # Convert to dictionary format for easy JSON serialization
            hist_dict = {
                'timestamp': hist.index.strftime('%Y-%m-%d %H:%M:%S').tolist(),
                'open': hist['Open'].tolist(),
                'high': hist['High'].tolist(),
                'low': hist['Low'].tolist(),
                'close': hist['Close'].tolist(),
                'volume': hist['Volume'].tolist()
            }
        else:
            hist_dict = {
                'timestamp': [],
                'open': [],
                'high': [],
                'low': [],
                'close': [],
                'volume': []
            }
        
        # Extract key information from quote
        price_info = {
            'symbol': symbol,
            'companyName': quote.get('shortName', symbol),
            'currentPrice': quote.get('currentPrice', quote.get('regularMarketPrice', 0)),
            'change': quote.get('regularMarketChange', 0),
            'changePercent': quote.get('regularMarketChangePercent', 0),
            'marketCap': quote.get('marketCap', 0),
            'peRatio': quote.get('trailingPE', 0),
            'lastUpdated': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        }
        
        return {
            'price': price_info,
            'historical': hist_dict
        }
        
    except Exception as e:
        print(f"Error fetching data for {symbol}: {e}")
        raise Exception(f"Failed to fetch data for {symbol}")

def search_stocks(query):
    """
    Search for stocks based on a query string
    
    Args:
        query (str): Search query (company name or symbol)
        
    Returns:
        list: List of matching stocks
    """
    # In a production application, you would integrate with a proper search API
    # This is a simplified example using the default list
    query = query.lower()
    results = []
    
    for symbol in DEFAULT_STOCKS:
        ticker = yf.Ticker(symbol)
        name = ticker.info.get('shortName', '')
        
        if query in symbol.lower() or query in name.lower():
            results.append({
                'symbol': symbol,
                'name': name
            })
    
    return results