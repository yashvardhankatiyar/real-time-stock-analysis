import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Dimensions,
} from 'react-native';

const API_URL = 'http://192.168.209.43:5000'; // Change to your server IP/hostname

// Theme colors (lilac theme)
const COLORS = {
  primary: '#9370DB', // Medium Purple / Lilac
  secondary: '#D8BFD8', // Thistle (light lilac)
  accent: '#7B68EE', // Medium Slate Blue
  background: '#F8F4FF', // Very light lilac
  text: '#4B0082', // Indigo
  textLight: '#6A5ACD', // Slate Blue
  success: '#0FBF5F', // Green
  error: '#FF6B6B', // Red
  neutral: '#ADA1D5', // Light slate blue
  border: '#C5B9F0', // Light purple
};

// Simple line chart component that doesn't rely on external libraries
const SimpleLineChart = ({ data, height, width, color }) => {
  if (!data || data.length < 2) return null;
  
  // Find min and max for scaling
  const minValue = Math.min(...data);
  const maxValue = Math.max(...data);
  const range = maxValue - minValue;
  
  // Calculate points
  const points = data.map((value, index) => {
    const x = (width / (data.length - 1)) * index;
    const normalizedValue = (value - minValue) / (range || 1);
    const y = height - (normalizedValue * height);
    return { x, y };
  });
  
  // Create SVG path
  let path = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    path += ` L ${points[i].x} ${points[i].y}`;
  }
  
  return (
    <View style={{ height, width }}>
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'space-between' }}>
        <Text style={{ color: COLORS.textLight, fontSize: 10 }}>{maxValue.toFixed(2)}</Text>
        <Text style={{ color: COLORS.textLight, fontSize: 10 }}>{minValue.toFixed(2)}</Text>
      </View>
      
      <View style={styles.chartGridlines}>
        <View style={styles.gridline} />
        <View style={styles.gridline} />
        <View style={styles.gridline} />
      </View>
      
      <View style={{ 
        position: 'absolute', 
        top: 0, 
        left: 0, 
        width: '100%', 
        height: '100%', 
        overflow: 'hidden'
      }}>
        {points.map((point, index) => (
          <View 
            key={index}
            style={{
              position: 'absolute',
              left: point.x - 2,
              top: point.y - 2,
              width: 4,
              height: 4,
              borderRadius: 2,
              backgroundColor: color || COLORS.accent,
            }}
          />
        ))}
        
        {points.map((point, index) => {
          if (index === 0) return null;
          const prevPoint = points[index - 1];
          
          // Calculate angle and length for the line
          const dx = point.x - prevPoint.x;
          const dy = point.y - prevPoint.y;
          const length = Math.sqrt(dx * dx + dy * dy);
          const angle = Math.atan2(dy, dx) * (180 / Math.PI);
          
          return (
            <View
              key={`line-${index}`}
              style={{
                position: 'absolute',
                left: prevPoint.x,
                top: prevPoint.y,
                width: length,
                height: 2,
                backgroundColor: color || COLORS.accent,
                transform: [
                  { translateX: 0 },
                  { translateY: -1 },
                  { rotate: `${angle}deg` },
                  { translateX: 0 },
                  { translateY: 1 },
                ],
              }}
            />
          );
        })}
      </View>
    </View>
  );
};

// Main App Component
export default function App() {
  const [stocks, setStocks] = useState([]);
  const [selectedStock, setSelectedStock] = useState(null);
  const [stockData, setStockData] = useState(null);
  const [indicators, setIndicators] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch available stocks on initial load
  useEffect(() => {
    fetchStocks();
  }, []);

  // When a stock is selected, fetch its data
  useEffect(() => {
    if (selectedStock) {
      fetchStockData(selectedStock);
      fetchStockAnalysis(selectedStock);
    }
  }, [selectedStock]);

  const fetchStocks = async () => {
    try {
      const response = await fetch(`${API_URL}/api/stocks`);
      const data = await response.json();
      setStocks(data.stocks);
      
      // Select first stock by default
      if (data.stocks && data.stocks.length > 0 && !selectedStock) {
        setSelectedStock(data.stocks[0]);
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching stocks:', error);
      setLoading(false);
    }
  };

  const fetchStockData = async (symbol) => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/stock/${symbol}`);
      const data = await response.json();
      setStockData(data.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching stock data:', error);
      setLoading(false);
    }
  };

  const fetchStockAnalysis = async (symbol) => {
    try {
      const response = await fetch(`${API_URL}/api/analysis/${symbol}`);
      const data = await response.json();
      setIndicators(data.indicators);
    } catch (error) {
      console.error('Error fetching stock analysis:', error);
    }
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    if (selectedStock) {
      Promise.all([
        fetchStockData(selectedStock),
        fetchStockAnalysis(selectedStock)
      ]).then(() => setRefreshing(false));
    } else {
      fetchStocks().then(() => setRefreshing(false));
    }
  }, [selectedStock]);

  const renderTrend = (trend) => {
    let color = COLORS.neutral;
    let icon = '■';
    
    if (trend === 'strong_uptrend' || trend === 'uptrend') {
      color = COLORS.success;
      icon = '▲';
    } else if (trend === 'strong_downtrend' || trend === 'downtrend') {
      color = COLORS.error;
      icon = '▼';
    }
    
    return (
      <Text style={[styles.trendLabel, {color}]}>
        {icon} {trend.replace('_', ' ')}
      </Text>
    );
  };

  // Render the app
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor={COLORS.primary} barStyle="light-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Stock Monitor</Text>
      </View>
      
      {/* Stock Selector */}
      <View style={styles.stockSelector}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {stocks.map((symbol) => (
            <TouchableOpacity
              key={symbol}
              style={[
                styles.stockButton,
                selectedStock === symbol && styles.selectedStockButton
              ]}
              onPress={() => setSelectedStock(symbol)}
            >
              <Text 
                style={[
                  styles.stockButtonText,
                  selectedStock === symbol && styles.selectedStockButtonText
                ]}
              >
                {symbol}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading stock data...</Text>
        </View>
      ) : (
        <ScrollView 
          style={styles.content}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {stockData && stockData.price && (
            <View style={styles.priceCard}>
              <Text style={styles.stockName}>{stockData.price.companyName}</Text>
              <Text style={styles.currentPrice}>
                ${stockData.price.currentPrice?.toFixed(2)}
              </Text>
              <Text 
                style={[
                  styles.changePrice,
                  {color: stockData.price.change >= 0 ? COLORS.success : COLORS.error}
                ]}
              >
                {stockData.price.change >= 0 ? '▲' : '▼'} 
                ${Math.abs(stockData.price.change).toFixed(2)} 
                ({Math.abs(stockData.price.changePercent).toFixed(2)}%)
              </Text>
            </View>
          )}
          
          {/* Chart Section */}
          {stockData && stockData.historical && stockData.historical.close && stockData.historical.close.length > 0 && (
            <View style={styles.chartContainer}>
              <Text style={styles.sectionTitle}>Price Chart</Text>
              <SimpleLineChart 
                data={stockData.historical.close.slice(-20)}
                height={180}
                width={Dimensions.get("window").width - 64}
                color={COLORS.accent}
              />
              <View style={styles.timeLabels}>
                {stockData.historical.timestamp.slice(-20).filter((_, i) => i % 5 === 0).map((date, i) => (
                  <Text key={i} style={styles.timeLabel}>
                    {date.split(' ')[1].substr(0, 5)}
                  </Text>
                ))}
              </View>
            </View>
          )}
          
          {/* Technical Indicators */}
          {indicators && (
            <View style={styles.indicatorsContainer}>
              <Text style={styles.sectionTitle}>Technical Analysis</Text>
              
              <View style={styles.indicatorRow}>
                <Text style={styles.indicatorLabel}>Trend:</Text>
                {renderTrend(indicators.trend)}
              </View>
              
              <View style={styles.indicatorRow}>
                <Text style={styles.indicatorLabel}>RSI:</Text>
                <Text style={styles.indicatorValue}>
                  {indicators.rsi && indicators.rsi.length > 0 ? 
                    indicators.rsi[indicators.rsi.length-1]?.toFixed(2) : 'N/A'}
                </Text>
              </View>
              
              <View style={styles.indicatorRow}>
                <Text style={styles.indicatorLabel}>MACD:</Text>
                <Text style={styles.indicatorValue}>
                  {indicators.macd && indicators.macd.macd && indicators.macd.macd.length > 0 ? 
                    indicators.macd.macd[indicators.macd.macd.length-1]?.toFixed(2) : 'N/A'}
                </Text>
              </View>
              
              <View style={styles.indicatorRow}>
                <Text style={styles.indicatorLabel}>Volume:</Text>
                <Text style={styles.indicatorValue}>
                  {indicators.volume_analysis ? 
                    indicators.volume_analysis.trend + 
                    (indicators.volume_analysis.unusual_activity ? ' (Unusual Activity)' : '')
                    : 'N/A'}
                </Text>
              </View>
            </View>
          )}
          
          {/* Moving Averages */}
          {indicators && indicators.moving_averages && (
            <View style={styles.movingAveragesContainer}>
              <Text style={styles.sectionTitle}>Moving Averages</Text>
              
              {Object.entries(indicators.moving_averages).map(([key, values]) => {
                const value = Array.isArray(values) && values.length > 0 ? 
                  values[values.length-1] : null;
                  
                return (
                  <View key={key} style={styles.indicatorRow}>
                    <Text style={styles.indicatorLabel}>{key}:</Text>
                    <Text style={styles.indicatorValue}>
                      {value !== null ? value.toFixed(2) : 'N/A'}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
          
          {/* Bollinger Bands */}
          {indicators && indicators.bollinger_bands && (
            <View style={styles.bandContainer}>
              <Text style={styles.sectionTitle}>Bollinger Bands</Text>
              
              <View style={styles.indicatorRow}>
                <Text style={styles.indicatorLabel}>Upper Band:</Text>
                <Text style={styles.indicatorValue}>
                  {indicators.bollinger_bands.upper && indicators.bollinger_bands.upper.length > 0 ? 
                    indicators.bollinger_bands.upper[indicators.bollinger_bands.upper.length-1]?.toFixed(2) : 'N/A'}
                </Text>
              </View>
              
              <View style={styles.indicatorRow}>
                <Text style={styles.indicatorLabel}>Middle Band:</Text>
                <Text style={styles.indicatorValue}>
                  {indicators.bollinger_bands.middle && indicators.bollinger_bands.middle.length > 0 ? 
                    indicators.bollinger_bands.middle[indicators.bollinger_bands.middle.length-1]?.toFixed(2) : 'N/A'}
                </Text>
              </View>
              
              <View style={styles.indicatorRow}>
                <Text style={styles.indicatorLabel}>Lower Band:</Text>
                <Text style={styles.indicatorValue}>
                  {indicators.bollinger_bands.lower && indicators.bollinger_bands.lower.length > 0 ? 
                    indicators.bollinger_bands.lower[indicators.bollinger_bands.lower.length-1]?.toFixed(2) : 'N/A'}
                </Text>
              </View>
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    paddingHorizontal: 16,
    elevation: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  stockSelector: {
    backgroundColor: COLORS.secondary,
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  stockButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 6,
    borderRadius: 16,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  selectedStockButton: {
    backgroundColor: COLORS.accent,
  },
  stockButtonText: {
    color: COLORS.text,
    fontWeight: '500',
  },
  selectedStockButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: COLORS.textLight,
  },
  priceCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    alignItems: 'center',
  },
  stockName: {
    fontSize: 18,
    fontWeight: '500',
    color: COLORS.text,
    marginBottom: 4,
  },
  currentPrice: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  changePrice: {
    fontSize: 16,
    fontWeight: '500',
    marginTop: 4,
  },
  chartContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    alignItems: 'center',
  },
  chartGridlines: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'space-between',
  },
  gridline: {
    height: 1,
    backgroundColor: COLORS.border,
    opacity: 0.5,
    width: '100%',
  },
  timeLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 8,
  },
  timeLabel: {
    fontSize: 10,
    color: COLORS.textLight,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
    alignSelf: 'flex-start',
  },
  indicatorsContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
  },
  movingAveragesContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
  },
  bandContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
  },
  indicatorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  indicatorLabel: {
    fontSize: 16,
    color: COLORS.textLight,
    fontWeight: '500',
  },
  indicatorValue: {
    fontSize: 16,
    color: COLORS.text,
    fontWeight: '600',
  },
  trendLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
});