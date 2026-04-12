import AsyncStorage from '@react-native-async-storage/async-storage';

export const fetchDailyExchangeRate = async () => {
  try {
    const cachedData = await AsyncStorage.getItem('@exchange_rate');
    
    if (cachedData) {
      const parsedCache = JSON.parse(cachedData);
      const today = new Date().toDateString();
      const lastUpdate = new Date(parsedCache.lastUpdated).toDateString();
      
      if (today === lastUpdate) {
        return parsedCache.rate;
      }
    }

    // BCV Oficial
    const response = await fetch('https://ve.dolarapi.com/v1/dolares/oficial');
    const data = await response.json();
    const currentRate = data.promedio || data.price || 36.50;

    await AsyncStorage.setItem('@exchange_rate', JSON.stringify({
      rate: currentRate,
      lastUpdated: new Date().getTime()
    }));

    return currentRate;
  } catch (error) {
    console.error("Error fetching official exchange rate:", error);
    return 36.50; 
  }
};

export const fetchUSDTExchangeRate = async () => {
  try {
    const cachedData = await AsyncStorage.getItem('@usdt_rate');
    if (cachedData) {
      const parsedCache = JSON.parse(cachedData);
      const isRecent = (new Date().getTime() - parsedCache.lastUpdated) < 1000 * 60 * 15; // 15 min
      if (isRecent) return parsedCache.rate;
    }

    // Binance P2P USDT
    const response = await fetch('https://criptoya.com/api/binancep2p/usdt/ves');
    const data = await response.json();
    const rate = data.ask || data.bid || 40.00; 

    await AsyncStorage.setItem('@usdt_rate', JSON.stringify({
      rate,
      lastUpdated: new Date().getTime()
    }));

    return rate;
  } catch (error) {
    console.error("USDT Fetch failed, using official fallback:", error);
    return null;
  }
};
