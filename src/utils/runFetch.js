import axios from 'axios';

const API_URL = 'http://localhost:5001/api/market-trends';

const runFetch = async (query) => {
  try {
    const response = await axios.post(API_URL, {
      query: query,
      includeMetrics: true
    });

    return response.data;
  } catch (error) {
    console.error('Error in runFetch:', error);
    throw error;
  }
};

export default runFetch; 