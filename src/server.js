const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(express.static(path.join(__dirname, 'public')));

app.get('/cities', (req, res) => {
  const filePath = path.join(__dirname, 'citys.txt');
  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to load cities' });
    }

    const cities = data
      .split('\n')
      .filter(line => !line.includes('Failed to fetch data'))
      .map(line => {
        const [idPart, cityName] = line.split(': ');
        const id = idPart.split(' ')[2]; 
        return { id, name: cityName.trim() };
      });

    res.json(cities);
  });
});

app.get('/weather', async (req, res) => {
  const { cityId } = req.query;

  if (!cityId) {
    return res.status(400).json({ error: 'City ID is required' });
  }

  try {
    const weatherData = await fetchWeatherData(cityId);
    res.json(weatherData); 
  } catch (error) {
    console.error('Error fetching weather data:', error.message);
    res.status(500).json({ error: 'Failed to fetch weather data' });
  }
});

async function fetchWeatherData(cityId) {
    const url = `https://www.meteo.gr/cf.cfm?city_id=${cityId}`;
    const response = await axios.get(url);

    if (response.status !== 200) {
        throw new Error('Failed to fetch data from meteo.gr');
    }

    const html = response.data;
    const $ = cheerio.load(html);

    const tempDiv = $('div.newtemp').first(); 
    const temperature = tempDiv.text().trim() || 'Temperature not found';

    const windDiv = $('div.windnr').first();
    const wind = windDiv.text().trim() || 'Wind data not found';

    const ygrasiaDiv = $('div.ygrasia').first();
    const ygrasia = ygrasiaDiv.text().replace('Υγρασία:', '').trim() || 'Humidity data not found';

    const piesiDiv = $('div.piesi').first();
    const piesi = piesiDiv.text().replace('Πίεση:', '').trim() || 'Pressure data not found';

    let highTemp = 'High temperature data not found';
    const highTempDiv = $('div.dailydata').first(); 
    if (highTempDiv.length) {
        const highTempSpan = highTempDiv.find('span.hight.highcolor').first();
        highTemp = highTempSpan.text().trim() || 'High temperature data not found';
    }

    let lowTemp = 'Low temperature data not found';
    const lowTempDiv = $('div.dailydata').eq(1);
    if (lowTempDiv && lowTempDiv.length) {
        const lowTempSpan = lowTempDiv.find('span.lowt.lowcolor').first(); 
        lowTemp = lowTempSpan.text().trim() || 'Low temperature data not found';
    }

    return [
        temperature,
        wind,
        ygrasia,
        piesi,
        highTemp,
        lowTemp,
    ];
}

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});