import { fetchRealTimeData } from './src/utils/pytrandApi.js'; // Adjust the path as necessary

const userInput = 'example query'; // Replace with actual user input

fetchRealTimeData(userInput)
    .then(data => {
        console.log('Fetched data:', data); // Handle the fetched data
    })
    .catch(error => {
        console.error('Error fetching data:', error); // Handle any errors
    }); 