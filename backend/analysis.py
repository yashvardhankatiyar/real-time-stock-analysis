import pandas as pd
import numpy as np

def calculate_indicators(stock_data):
    """
    Calculate technical indicators for the given stock data
    
    Args:
        stock_data (dict): Dictionary containing historical price data
        
    Returns:
        dict: Dictionary with calculated technical indicators
    """
    try:
        # Extract historical data
        hist_data = stock_data['historical']
        
        # Create a pandas DataFrame from the historical data
        df = pd.DataFrame({
            'open': hist_data['open'],
            'high': hist_data['high'],
            'low': hist_data['low'],
            'close': hist_data['close'],
            'volume': hist_data['volume']
        }, index=pd.to_datetime(hist_data['timestamp']))
        
        # Calculate moving averages
        ma_periods = [5, 10, 20, 50]
        moving_averages = {}
        
        for period in ma_periods:
            if len(df) >= period:
                ma = df['close'].rolling(window=period).mean()
                moving_averages[f'SMA_{period}'] = ma.tolist()
            else:
                moving_averages[f'SMA_{period}'] = [None] * len(df)
        
        # Calculate RSI (Relative Strength Index)
        rsi = calculate_rsi(df['close'])
        
        # Calculate MACD (Moving Average Convergence Divergence)
        macd, signal, histogram = calculate_macd(df['close'])
        
        # Calculate Bollinger Bands
        upper_band, middle_band, lower_band = calculate_bollinger_bands(df['close'])
        
        # Prepare results
        results = {
            'moving_averages': moving_averages,
            'rsi': rsi.tolist() if isinstance(rsi, (pd.Series, np.ndarray)) else rsi,
            'macd': {
                'macd': macd.tolist() if isinstance(macd, (pd.Series, np.ndarray)) else macd,
                'signal': signal.tolist() if isinstance(signal, (pd.Series, np.ndarray)) else signal,
                'histogram': histogram.tolist() if isinstance(histogram, (pd.Series, np.ndarray)) else histogram
            },
            'bollinger_bands': {
                'upper': upper_band.tolist() if isinstance(upper_band, (pd.Series, np.ndarray)) else upper_band,
                'middle': middle_band.tolist() if isinstance(middle_band, (pd.Series, np.ndarray)) else middle_band,
                'lower': lower_band.tolist() if isinstance(lower_band, (pd.Series, np.ndarray)) else lower_band
            }
        }
        
        # Add trend analysis
        results['trend'] = analyze_trend(df['close'], moving_averages)
        
        # Add volume analysis
        results['volume_analysis'] = analyze_volume(df)
        
        return results
        
    except Exception as e:
        print(f"Error calculating indicators: {e}")
        return {
            'error': str(e),
            'moving_averages': {},
            'rsi': [],
            'macd': {'macd': [], 'signal': [], 'histogram': []},
            'bollinger_bands': {'upper': [], 'middle': [], 'lower': []},
            'trend': 'unknown',
            'volume_analysis': {'trend': 'unknown', 'unusual_activity': False}
        }

def calculate_rsi(price_series, periods=14):
    """Calculate RSI technical indicator"""
    if len(price_series) < periods + 1:
        return [None] * len(price_series)
        
    # Calculate price changes
    delta = price_series.diff()
    
    # Make two series: one for gains and one for losses
    gain = delta.clip(lower=0)
    loss = -delta.clip(upper=0)
    
    # Calculate average gain and loss
    avg_gain = gain.rolling(window=periods).mean()
    avg_loss = loss.rolling(window=periods).mean()
    
    # Calculate RS (Relative Strength)
    rs = avg_gain / avg_loss
    
    # Calculate RSI
    rsi = 100 - (100 / (1 + rs))
    
    return rsi

def calculate_macd(price_series, fast_period=12, slow_period=26, signal_period=9):
    """Calculate MACD technical indicator"""
    if len(price_series) < slow_period + signal_period:
        return [None] * len(price_series), [None] * len(price_series), [None] * len(price_series)
        
    # Calculate EMAs
    ema_fast = price_series.ewm(span=fast_period, adjust=False).mean()
    ema_slow = price_series.ewm(span=slow_period, adjust=False).mean()
    
    # Calculate MACD line
    macd_line = ema_fast - ema_slow
    
    # Calculate signal line
    signal_line = macd_line.ewm(span=signal_period, adjust=False).mean()
    
    # Calculate histogram
    histogram = macd_line - signal_line
    
    return macd_line, signal_line, histogram

def calculate_bollinger_bands(price_series, window=20, num_std=2):
    """Calculate Bollinger Bands technical indicator"""
    if len(price_series) < window:
        empty = [None] * len(price_series)
        return empty, empty, empty
        
    # Calculate middle band (simple moving average)
    middle_band = price_series.rolling(window=window).mean()
    
    # Calculate standard deviation
    std = price_series.rolling(window=window).std()
    
    # Calculate upper and lower bands
    upper_band = middle_band + (std * num_std)
    lower_band = middle_band - (std * num_std)
    
    return upper_band, middle_band, lower_band

def analyze_trend(price_series, moving_averages):
    """Analyze price trend based on moving averages"""
    # Get the last price
    if isinstance(price_series, pd.Series) and len(price_series) > 0:
        last_price = price_series.iloc[-1]
        
        # Short-term trend: price vs 5-day MA
        short_ma = moving_averages.get('SMA_5', [None])[-1]
        
        # Medium-term trend: price vs 20-day MA
        medium_ma = moving_averages.get('SMA_20', [None])[-1]
        
        # Long-term trend: 20-day MA vs 50-day MA
        long_ma = moving_averages.get('SMA_50', [None])[-1]
        
        # Determine trend
        if short_ma is not None and medium_ma is not None and long_ma is not None:
            if last_price > short_ma and short_ma > medium_ma and medium_ma > long_ma:
                return 'strong_uptrend'
            elif last_price > short_ma and short_ma > medium_ma:
                return 'uptrend'
            elif last_price < short_ma and short_ma < medium_ma and medium_ma < long_ma:
                return 'strong_downtrend'
            elif last_price < short_ma and short_ma < medium_ma:
                return 'downtrend'
            elif last_price > medium_ma:
                return 'moderately_bullish'
            elif last_price < medium_ma:
                return 'moderately_bearish'
    
    return 'neutral'

def analyze_volume(df):
    """Analyze volume patterns"""
    if len(df) < 10:  # Need at least 10 data points
        return {'trend': 'unknown', 'unusual_activity': False}
    
    # Calculate average volume
    avg_volume = df['volume'].rolling(window=10).mean()
    last_volume = df['volume'].iloc[-1]
    
    # Check if current volume is significantly higher than average
    unusual_activity = last_volume > (avg_volume.iloc[-1] * 1.5) if not pd.isna(avg_volume.iloc[-1]) else False
    
    # Determine volume trend
    if len(df) >= 5:
        recent_volumes = df['volume'].iloc[-5:]
        volume_trend = 'increasing' if recent_volumes.is_monotonic_increasing else 'decreasing' if recent_volumes.is_monotonic_decreasing else 'stable'
    else:
        volume_trend = 'unknown'
    
    return {
        'trend': volume_trend,
        'unusual_activity': unusual_activity,
        'current_volume': int(last_volume),
        'average_volume': int(avg_volume.iloc[-1]) if not pd.isna(avg_volume.iloc[-1]) else 0
    }